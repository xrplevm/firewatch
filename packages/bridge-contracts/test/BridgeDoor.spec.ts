import { CreateBridgeFixtures, ValidCreateBridgeFixtures } from "./fixtures/create-bridge-fixtures";
import { expect } from "chai";
import { DeployBridgeTokenResult, DeploySafeResult } from "./fixtures/types";
import { deploySafe } from "./fixtures/deploy-safe";
import { createBridge } from "./fixtures/create-bridge";
import { deployBridgeDoor } from "./fixtures/deploy-bridge-door";
import { deployBridgeToken } from "./fixtures/deploy-bridge-token";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { withFixtures } from "./fixtures/with-fixtures";
import { claimIdFromTransaction } from "./core/utils";
import { expectReceivedTimes, expectReceivedWith, expectSentTimes, expectSentWith, expectTokenTransferWith } from "./core/expects";
import { BigNumber } from "ethers";
import { AddressOne, AddressZero } from "./core/constants";
import { BridgeType } from "./core/bridgeType";
import hre, { ethers } from "hardhat";

describe("BridgeDoor contract", function () {
    beforeEach(async () => {
        await hre.network.provider.send("hardhat_reset", []);
    });

    describe("XChainCreateBridge", async () => {
        let deploySafeResult: DeploySafeResult;
        let deployBridgeTokenResult: DeployBridgeTokenResult;

        beforeEach(async () => {
            deploySafeResult = await loadFixture(
                deploySafe({
                    params: {
                        witnessNumber: 1,
                        threshold: 1,
                    },
                }),
            );
            deployBridgeTokenResult = await loadFixture(
                deployBridgeToken({ params: { tokenCode: "TOKEN", tokenName: "Hardhat Test Token" } }),
            );
        });

        it("should create bridge", async () => {
            for (const fixture of CreateBridgeFixtures) {
                const deployBridgeDoorResult = await deployBridgeDoor(deploySafeResult, fixture)();
                await createBridge(deployBridgeDoorResult, deployBridgeTokenResult, fixture, async (action, bridgeDoor, bridgeConfig) => {
                    if (fixture.error) {
                        await expect(action).to.be.revertedWith(fixture.error);
                    } else {
                        await action;
                        const createdBridgeConfig = await bridgeDoor.getBridgeConfig(bridgeConfig);
                        expect(createdBridgeConfig).to.deep.equal([
                            bridgeConfig.lockingChainDoor,
                            bridgeConfig.lockingChainIssue.issuer,
                            bridgeConfig.lockingChainIssue.currency,
                            bridgeConfig.issuingChainDoor,
                            bridgeConfig.issuingChainIssue.issuer,
                            bridgeConfig.issuingChainIssue.currency,
                        ]);
                    }
                })();
            }
        });

        it("should not allow creating same bridges", async () => {
            for (const fixture of ValidCreateBridgeFixtures) {
                const deployBridgeDoorResult = await deployBridgeDoor(deploySafeResult, fixture)();
                await createBridge(deployBridgeDoorResult, deployBridgeTokenResult, fixture)();
                await createBridge(deployBridgeDoorResult, deployBridgeTokenResult, fixture, async (action) => {
                    await expect(action).to.be.revertedWith("XChainBridge already registered");
                })();
            }
        });
    });

    describe("CreateBridgeRequest", async () => {
        it("should create a bridge request", async () => {
            await withFixtures(async ({ bridgeDoor }, fromBlock) => {
                await bridgeDoor.createBridgeRequest(AddressOne, { value: ethers.utils.parseEther("25") });
                const events = await bridgeDoor.queryFilter(bridgeDoor.filters.CreateBridgeRequest(), fromBlock);
                expect(events.length).to.equal(1);
                expect(events[0].args.tokenAddress).to.equal(AddressOne);
            });
        });

        it("should not allow to create a bridge request without enough reward", async () => {
            await withFixtures(async ({ bridgeDoor, bridgeToken }) => {
                await expect(bridgeDoor.createBridgeRequest(bridgeToken.address)).to.be.revertedWith("Not enough reward");
            });
        });

        it("should not allow to create a bridge request for an existing bridge", async () => {
            await withFixtures(async ({ bridgeDoor, bridgeToken, config }) => {
                if (config.lockingChainIssue.currency !== "XRP" && config.issuingChainIssue.currency !== "XRP") {
                    await expect(
                        bridgeDoor.createBridgeRequest(bridgeToken.address, { value: ethers.utils.parseEther("25") }),
                    ).to.be.revertedWith("Token already registered");
                }
            });
        });
    });

    describe("CreateClaimId", async () => {
        it("Should create sequential claim ids ", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, params }) => {
                const [sender, receiver] = users;
                let intentTx = await bridgeDoor
                    .connect(sender)
                    .createClaimId(config, receiver.address, { value: params.signatureReward + 1 });
                let tx = await intentTx.wait();
                expect(claimIdFromTransaction(tx).toNumber()).to.equal(1);

                intentTx = await bridgeDoor.connect(sender).createClaimId(config, receiver.address, { value: params.signatureReward });
                tx = await intentTx.wait();
                expect(claimIdFromTransaction(tx).toNumber()).to.equal(2);

                const [, , exists] = await bridgeDoor.getBridgeClaim(config, 2);
                expect(exists).to.equal(true);
            });
        });

        it("Should receive claim reward ", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, params, safe }, fromBlock) => {
                const [sender, receiver] = users;

                await bridgeDoor.connect(sender).createClaimId(config, receiver.address, { value: params.signatureReward });

                await expectReceivedTimes(safe, 1, fromBlock);
                await expectReceivedWith(safe, sender.address, BigNumber.from(params.signatureReward), fromBlock);
            });
        });

        it("Should not create sequential claim ids because there's no enough reward ", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, params }) => {
                const [sender, receiver] = users;
                if (params.signatureReward > 0) {
                    await expect(
                        bridgeDoor.connect(sender).createClaimId(config, receiver.address, { value: params.signatureReward - 1 }),
                    ).to.be.revertedWith("createClaimId: amount sent is smaller than required signature reward");
                }
            });
        });
    });

    describe("Commit", async () => {
        it("Should commit on native correctly ", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe }, fromBlock) => {
                    await bridgeDoor.connect(users[0]).commit(config, users[1].address, 1, 1, { value: 1 });
                    await expectReceivedTimes(safe, 1, fromBlock);
                    await expectReceivedWith(safe, users[0].address, BigNumber.from(1), fromBlock);
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should not commit on native when value is 0", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe }) => {
                    await bridgeDoor.connect(users[0]).commit(config, users[1].address, 1, 1);
                    await expectReceivedTimes(safe, 0);
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should not commit on native when value sent does not match commit value", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config }) => {
                    await expect(bridgeDoor.connect(users[0]).commit(config, users[1].address, 1, 2, { value: 1 })).to.be.revertedWith(
                        "Sent amount must be at least equal to amount",
                    );
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should commit on locking token correctly", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, bridgeToken, safe }) => {
                    await bridgeToken!.connect(bridgeToken!.signer).mint(users[0].address, 150);
                    await bridgeToken!.connect(users[0]).approve(bridgeDoor.address, 1000);
                    await bridgeDoor.connect(users[0]).commit(config, users[1].address, 1, 100);
                    const events = await bridgeDoor.queryFilter(bridgeDoor.filters.Commit());
                    expect(events.length).to.equal(1);
                    expect(events[0].args.claimId).to.equal(1);
                    expect(events[0].args.sender).to.equal(users[0].address);
                    expect(events[0].args.value).to.equal(100);
                    expect(events[0].args.receiver).to.equal(users[1].address);
                    await expectTokenTransferWith(bridgeToken!, users[0].address, safe.address, BigNumber.from(100));
                },
                [BridgeType.LOCKING_TOKEN],
            );
        });

        it("Should commit on issuing token correctly", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, bridgeToken, params, witnesses, threshold }) => {
                    const [sender, receiver, receiver2] = users;
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(config, claimId, 50, receiver.address, receiver.address)
                        ).wait();
                    }

                    await bridgeToken!.connect(receiver).approve(bridgeDoor.address, 1000);
                    await bridgeDoor.connect(receiver).commit(config, receiver2.address, 1, 50);
                    const events = await bridgeDoor.queryFilter(bridgeDoor.filters.Commit());
                    expect(events.length).to.equal(1);
                    expect(events[0].args.claimId).to.equal(1);
                    expect(events[0].args.sender).to.equal(receiver.address);
                    expect(events[0].args.value).to.equal(50);
                    expect(events[0].args.receiver).to.equal(receiver2.address);
                    await expectTokenTransferWith(bridgeToken!, receiver.address, AddressZero, BigNumber.from(50));
                },
                [BridgeType.ISSUING_TOKEN],
            );
        });
    });

    describe("CreateAccountCommit", async () => {
        it("Should create account commit correctly", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params }, fromBlock) => {
                    const [source, destination] = users;
                    const { signatureReward: reward, minCreateAmount: amount } = params;
                    await bridgeDoor
                        .connect(source)
                        .createAccountCommit(config, destination.address, amount, reward, { value: amount + reward });
                    await expectReceivedTimes(safe, 1, fromBlock);
                    await expectReceivedWith(safe, source.address, BigNumber.from(amount + reward), fromBlock);
                    const events = await bridgeDoor.queryFilter(bridgeDoor.filters.CreateAccountCommit());
                    expect(events.length).to.equal(1);
                    expect(events[0].args.creator).to.equal(source.address);
                    expect(events[0].args.destination).to.equal(destination.address);
                    expect(events[0].args.value).to.equal(amount);
                    expect(events[0].args.signatureReward).to.equal(reward);
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when insufficient signature reward", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params }) => {
                    const [source, destination] = users;
                    const { signatureReward: reward, minCreateAmount: amount } = params;
                    if (reward === 0) return;
                    await expect(
                        bridgeDoor.connect(source).createAccountCommit(config, destination.address, amount, reward - 1, {
                            value: amount + params.signatureReward,
                        }),
                    ).to.be.revertedWith("createAccountCommit: amount sent is smaller than required signature reward");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when insufficient minAccountCreateAmount", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params }) => {
                    const [source, destination] = users;
                    const { signatureReward: reward, minCreateAmount: amount } = params;
                    await expect(
                        bridgeDoor
                            .connect(source)
                            .createAccountCommit(config, destination.address, amount - 1, reward, { value: amount + reward }),
                    ).to.be.revertedWith("createAccountCommit: amount sent is smaller than required minimum account create amount");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when insufficient sent value", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params }) => {
                    const [source, destination] = users;
                    const { signatureReward: reward, minCreateAmount: amount } = params;
                    await expect(
                        bridgeDoor
                            .connect(source)
                            .createAccountCommit(config, destination.address, amount, reward, { value: amount + reward - 1 }),
                    ).to.be.revertedWith("createAccountCommit: not enough balance sent");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when committing in token bridge", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params }) => {
                    const [source, destination] = users;
                    const { signatureReward: reward } = params;
                    await expect(
                        bridgeDoor.connect(source).createAccountCommit(config, destination.address, 100, reward, { value: 100 + reward }),
                    ).to.be.revertedWith("createAccountCommit: cannot create account with a token bridge");
                },
                [BridgeType.LOCKING_TOKEN, BridgeType.ISSUING_TOKEN],
            );
        });
    });

    describe("Claim", async () => {
        it("should claim correctly on native", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    const [creator, sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(creator)
                        .createClaimId(config, sender.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 20, sender.address, AddressZero)
                        ).wait();
                    }

                    await bridgeDoor.connect(creator).claim(config, claimId, 20, receiver.address);
                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, receiver.address, BigNumber.from(20), "0x", 0, fromBlock);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }

                    const creditEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Credit());
                    expect(creditEvents.length).to.equal(1);
                    expect(creditEvents[0].args.claimId).to.equal(1);
                    expect(creditEvents[0].args.receiver).to.equal(receiver.address);
                    expect(creditEvents[0].args.value).to.equal(20);

                    const claimEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Claim());
                    expect(claimEvents.length).to.equal(1);
                    expect(claimEvents[0].args.claimId).to.equal(1);
                    expect(claimEvents[0].args.sender).to.equal(creator.address);
                    expect(claimEvents[0].args.destination).to.equal(receiver.address);
                    expect(claimEvents[0].args.value).to.equal(20);
                },
                [BridgeType.NATIVE],
            );
        });

        it("should claim correctly on locking token", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, bridgeToken, params, threshold, witnesses }) => {
                    const [creator, sender, receiver] = users;
                    await bridgeToken!.connect(bridgeToken!.signer).mint(safe.address, 100);
                    const intentTx = await bridgeDoor
                        .connect(creator)
                        .createClaimId(config, sender.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 20, sender.address, AddressZero)
                        ).wait();
                    }

                    await bridgeDoor.connect(creator).claim(config, claimId, 20, receiver.address);
                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(safe, witnesses[i].address, BigNumber.from(params.signatureReward).div(threshold), "0x", 0);
                    }
                    await expectTokenTransferWith(bridgeToken!, safe.address, receiver.address, BigNumber.from(20));

                    const creditEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Credit());
                    expect(creditEvents.length).to.equal(1);
                    expect(creditEvents[0].args.claimId).to.equal(1);
                    expect(creditEvents[0].args.receiver).to.equal(receiver.address);
                    expect(creditEvents[0].args.value).to.equal(20);

                    const claimEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Claim());
                    expect(claimEvents.length).to.equal(1);
                    expect(claimEvents[0].args.claimId).to.equal(1);
                    expect(claimEvents[0].args.sender).to.equal(creator.address);
                    expect(claimEvents[0].args.destination).to.equal(receiver.address);
                    expect(claimEvents[0].args.value).to.equal(20);
                },
                [BridgeType.LOCKING_TOKEN],
            );
        });

        it("should claim correctly on issuing token", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, bridgeToken, params, threshold, witnesses }) => {
                    const [creator, sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(creator)
                        .createClaimId(config, sender.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 20, sender.address, AddressZero)
                        ).wait();
                    }

                    await bridgeDoor.connect(creator).claim(config, claimId, 20, receiver.address);
                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(safe, witnesses[i].address, BigNumber.from(params.signatureReward).div(threshold), "0x", 0);
                    }
                    await expectTokenTransferWith(bridgeToken!, AddressZero, receiver.address, BigNumber.from(20));

                    const creditEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Credit());
                    expect(creditEvents.length).to.equal(1);
                    expect(creditEvents[0].args.claimId).to.equal(1);
                    expect(creditEvents[0].args.receiver).to.equal(receiver.address);
                    expect(creditEvents[0].args.value).to.equal(20);

                    const claimEvents = await bridgeDoor.queryFilter(bridgeDoor.filters.Claim());
                    expect(claimEvents.length).to.equal(1);
                    expect(claimEvents[0].args.claimId).to.equal(1);
                    expect(claimEvents[0].args.sender).to.equal(creator.address);
                    expect(claimEvents[0].args.destination).to.equal(receiver.address);
                    expect(claimEvents[0].args.value).to.equal(20);
                },
                [BridgeType.ISSUING_TOKEN],
            );
        });

        it("should revert if claim does not exist", async () => {
            await withFixtures(async ({ bridgeDoor, users, config }) => {
                const [creator, receiver] = users;
                await expect(bridgeDoor.connect(creator).claim(config, 1, 20, receiver.address)).to.be.revertedWith("Claim not found");
            });
        });

        it("should revert if claimer is not creator", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, params }) => {
                const [creator, sender, claimer] = users;
                const intentTx = await bridgeDoor.connect(creator).createClaimId(config, sender.address, { value: params.signatureReward });
                const tx = await intentTx.wait();
                const claimId = claimIdFromTransaction(tx);
                await expect(bridgeDoor.connect(claimer).claim(config, claimId, 20, claimer.address)).to.be.revertedWith(
                    "Claim claimer has to be original creator",
                );
            });
        });

        it("should revert if claim amount is different from attested amount", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params, threshold, witnesses }) => {
                    const [creator, sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(creator)
                        .createClaimId(config, sender.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 20, sender.address, AddressZero)
                        ).wait();
                    }

                    await expect(bridgeDoor.connect(creator).claim(config, claimId, 50, receiver.address)).to.be.revertedWith(
                        "claim: attested amount different from claimed amount",
                    );
                },
                [BridgeType.NATIVE],
            );
        });
    });

    describe("AddClaimAttestation", async () => {
        it("Should only be called by a witness", async () => {
            await withFixtures(async ({ bridgeDoor, users, config }) => {
                await expect(
                    bridgeDoor.connect(users[0]).addClaimAttestation(config, 1, 1, users[0].address, users[0].address),
                ).to.be.revertedWith("caller is not a witness");
            });
        });

        it("Should attest correctly without address and not credit", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }) => {
                const [sender, receiver] = users;
                const intentTx = await bridgeDoor
                    .connect(sender)
                    .createClaimId(config, receiver.address, { value: params.signatureReward });
                const tx = await intentTx.wait();
                const claimId = claimIdFromTransaction(tx);

                for (let i = 0; i < threshold; i++) {
                    await (
                        await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 1, receiver.address, AddressZero)
                    ).wait();
                }

                const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                expect(exists).to.equal(true);

                await expectSentTimes(safe, 0);
            });
        });

        it("Should attest correctly on native", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    const [sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(config, claimId, 1, receiver.address, receiver.address)
                        ).wait();
                    }

                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, receiver.address, BigNumber.from(1), "0x", 0, fromBlock);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should attest correctly on locking token", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, bridgeToken, params, threshold, witnesses }) => {
                    const [sender, receiver] = users;
                    await bridgeToken!.connect(bridgeToken!.signer).mint(safe.address, 100);
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(config, claimId, 50, receiver.address, receiver.address)
                        ).wait();
                    }

                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(safe, witnesses[i].address, BigNumber.from(params.signatureReward).div(threshold), "0x", 0);
                    }
                    await expectTokenTransferWith(bridgeToken!, safe.address, receiver.address, BigNumber.from(50));
                },
                [BridgeType.LOCKING_TOKEN],
            );
        });

        it("Should attest correctly on issuing token", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, bridgeToken, params, threshold, witnesses }) => {
                    const [sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(config, claimId, 50, receiver.address, receiver.address)
                        ).wait();
                    }

                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(safe, witnesses[i].address, BigNumber.from(params.signatureReward).div(threshold), "0x", 0);
                    }
                    await expectTokenTransferWith(bridgeToken!, AddressZero, receiver.address, BigNumber.from(50));
                },
                [BridgeType.ISSUING_TOKEN],
            );
        });

        it("Should different amounts and not reach consensus", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }) => {
                if (threshold <= 1) return;

                const [sender, receiver] = users;
                const intentTx = await bridgeDoor
                    .connect(sender)
                    .createClaimId(config, receiver.address, { value: params.signatureReward });
                const tx = await intentTx.wait();
                const claimId = claimIdFromTransaction(tx);

                for (let i = 0; i < threshold; i++) {
                    await (
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addClaimAttestation(config, claimId, i + 1, receiver.address, receiver.address)
                    ).wait();
                }

                const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                expect(exists).to.equal(true);
                await expectSentTimes(safe, 0);
            });
        });

        it("Should different destinations and not reach consensus", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }) => {
                if (threshold <= 1) return;

                const [sender, receiver] = users;
                const intentTx = await bridgeDoor
                    .connect(sender)
                    .createClaimId(config, receiver.address, { value: params.signatureReward });
                const tx = await intentTx.wait();
                const claimId = claimIdFromTransaction(tx);

                for (let i = 0; i < threshold; i++) {
                    await (
                        await bridgeDoor.connect(witnesses[i]).addClaimAttestation(config, claimId, 1, receiver.address, users[i].address)
                    ).wait();
                }

                const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                expect(exists).to.equal(true);
                await expectSentTimes(safe, 0);
            });
        });

        it("Should some witnesses attest different destinations but reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    if (threshold <= 1 || threshold >= witnesses.length) return;

                    const [sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold + 1; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(
                                    config,
                                    claimId,
                                    i === 0 ? 123 : 1,
                                    receiver.address,
                                    i === 0 ? sender.address : receiver.address,
                                )
                        ).wait();
                    }

                    const [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, receiver.address, BigNumber.from(1), "0x", 0, fromBlock);
                    for (let i = 1; i < threshold + 1; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should attest multiple times and finally reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    if (threshold <= 1) return;
                    const [sender, receiver] = users;
                    const intentTx = await bridgeDoor
                        .connect(sender)
                        .createClaimId(config, receiver.address, { value: params.signatureReward });
                    const tx = await intentTx.wait();
                    const claimId = claimIdFromTransaction(tx);

                    for (let i = 0; i < threshold - 1; i++) {
                        await (
                            await bridgeDoor
                                .connect(witnesses[i])
                                .addClaimAttestation(config, claimId, 1, receiver.address, receiver.address)
                        ).wait();
                    }

                    const witness = witnesses[threshold - 1];
                    await (
                        await bridgeDoor.connect(witness).addClaimAttestation(config, claimId, 2, receiver.address, receiver.address)
                    ).wait();
                    let [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(true);
                    await expectSentTimes(safe, 0, fromBlock);

                    await (
                        await bridgeDoor.connect(witness).addClaimAttestation(config, claimId, 1, receiver.address, receiver.address)
                    ).wait();
                    [, , exists] = await bridgeDoor.getBridgeClaim(config, claimId);
                    expect(exists).to.equal(false);

                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, receiver.address, BigNumber.from(1), "0x", 0, fromBlock);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when attesting invalid sender ", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, params, witnesses }) => {
                const [sender, receiver] = users;
                const intentTx = await bridgeDoor
                    .connect(sender)
                    .createClaimId(config, receiver.address, { value: params.signatureReward });
                const tx = await intentTx.wait();
                const claimId = claimIdFromTransaction(tx);
                await expect(
                    bridgeDoor.connect(witnesses[0]).addClaimAttestation(config, claimId, 1, sender.address, receiver.address),
                ).to.be.revertedWith("attestClaim: sender does not match");
            });
        });

        it("Should throw error when attesting invalid claim id ", async () => {
            await withFixtures(async ({ bridgeDoor, users, config, witnesses }) => {
                const [sender, receiver] = users;
                await expect(
                    bridgeDoor.connect(witnesses[0]).addClaimAttestation(config, 1, 1, sender.address, receiver.address),
                ).to.be.revertedWith("Claim not found");
            });
        });
    });

    describe("AddCreateAccountAttestation", async () => {
        it("Should only be called by a witness", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params }) => {
                    await expect(
                        bridgeDoor.connect(users[0]).addCreateAccountAttestation(config, users[0].address, params.minCreateAmount, 1),
                    ).to.be.revertedWith("caller is not a witness");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should create an account attestation", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    const [destination] = users;
                    for (let i = 0; i < threshold; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount + 1, 1);
                    }
                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, destination.address, BigNumber.from(params.minCreateAmount + 1), "0x", 0, fromBlock);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should attest different amounts and not reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }) => {
                    if (threshold <= 1) return;
                    const [destination] = users;
                    for (let i = 0; i < threshold; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount + i, 1);
                    }
                    await expectSentTimes(safe, 0);
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should attest different destinations and not reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }) => {
                    if (threshold <= 1) return;
                    for (let i = 0; i < threshold; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(config, users[i].address, params.minCreateAmount + i, 1);
                    }
                    await expectSentTimes(safe, 0);
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should some witnesses attest different amounts but reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    if (threshold <= 1 || threshold >= witnesses.length) return;

                    const [destination] = users;
                    for (let i = 0; i < threshold + 1; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(
                                config,
                                destination.address,
                                BigNumber.from(i === 0 ? params.minCreateAmount + 1 : params.minCreateAmount),
                                1,
                            );
                    }
                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, destination.address, BigNumber.from(params.minCreateAmount), "0x", 0, fromBlock);
                    for (let i = 1; i < threshold + 1; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should attest multiple times and finally reach consensus", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe, params, threshold, witnesses }, fromBlock) => {
                    if (threshold <= 1) return;
                    const [destination] = users;

                    for (let i = 0; i < threshold - 1; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount, 1);
                    }

                    const witness = witnesses[threshold - 1];
                    await bridgeDoor
                        .connect(witness)
                        .addCreateAccountAttestation(config, destination.address, params.minCreateAmount + 1, 1);
                    let [, isCreated] = await bridgeDoor.getBridgeCreateAccount(config, destination.address);
                    expect(isCreated).to.equal(false);
                    await expectSentTimes(safe, 0, fromBlock);

                    await bridgeDoor.connect(witness).addCreateAccountAttestation(config, destination.address, params.minCreateAmount, 1);
                    [, isCreated] = await bridgeDoor.getBridgeCreateAccount(config, destination.address);
                    expect(isCreated).to.equal(true);

                    await expectSentTimes(safe, threshold + 1, fromBlock);
                    await expectSentWith(safe, destination.address, BigNumber.from(params.minCreateAmount), "0x", 0, fromBlock);
                    for (let i = 0; i < threshold; i++) {
                        await expectSentWith(
                            safe,
                            witnesses[i].address,
                            BigNumber.from(params.signatureReward).div(threshold),
                            "0x",
                            0,
                            fromBlock,
                        );
                    }
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when attesting less amount than minimum account create amount", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params, witnesses }) => {
                    if (params.minCreateAmount < 1) return;
                    await expect(
                        bridgeDoor
                            .connect(witnesses[0])
                            .addCreateAccountAttestation(config, users[0].address, params.minCreateAmount - 1, 1),
                    ).to.be.revertedWith("attestCreateAccount: insufficient minimum amount sent");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when attesting already created account", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params, threshold, witnesses }) => {
                    const [destination] = users;
                    for (let i = 0; i < threshold; i++) {
                        await bridgeDoor
                            .connect(witnesses[i])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount, 1);
                    }
                    await expect(
                        bridgeDoor
                            .connect(witnesses[0])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount, 1),
                    ).to.be.revertedWith("attestCreateAccount: createAccountData is already created");
                },
                [BridgeType.NATIVE],
            );
        });

        it("Should throw error when attesting in token bridge", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, params, witnesses }) => {
                    const [destination] = users;
                    await expect(
                        bridgeDoor
                            .connect(witnesses[0])
                            .addCreateAccountAttestation(config, destination.address, params.minCreateAmount, 1),
                    ).to.be.revertedWith("createAccountCommit: cannot attest account create on token bridge");
                },
                [BridgeType.LOCKING_TOKEN, BridgeType.ISSUING_TOKEN],
            );
        });
    });

    describe("Ownership", async () => {
        it("Safe should be initialized correctly", async () => {
            await withFixtures(
                async ({ bridgeDoor, safe }) => {
                    expect(await bridgeDoor.owner()).to.equal(safe.address);
                    expect(await bridgeDoor.paused()).to.equal(false);
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
        it("Owner should be able to pause contract", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, config, safe }) => {
                    await safe.execTransactionFromModule(bridgeDoor.address, 0, bridgeDoor.interface.encodeFunctionData("pause"), "0");
                    expect(await bridgeDoor.paused()).to.equal(true);
                    await expect(bridgeDoor.createClaimId(config, users[0].address)).to.be.revertedWith("Pausable: paused");
                    await expect(bridgeDoor.commit(config, users[0].address, 1, 1)).to.be.revertedWith("Pausable: paused");
                    await expect(bridgeDoor.commitWithoutAddress(config, 1, 1)).to.be.revertedWith("Pausable: paused");
                    await expect(bridgeDoor.createAccountCommit(config, users[0].address, 1, 1)).to.be.revertedWith("Pausable: paused");
                    await expect(bridgeDoor.addCreateAccountAttestation(config, users[0].address, 1, 1)).to.be.revertedWith(
                        "Pausable: paused",
                    );
                    await expect(bridgeDoor.addClaimAttestation(config, 1, 1, users[0].address, users[1].address)).to.be.revertedWith(
                        "Pausable: paused",
                    );
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
        it("Owner should be able to unpause contract", async () => {
            await withFixtures(
                async ({ bridgeDoor, safe }) => {
                    await safe.execTransactionFromModule(bridgeDoor.address, 0, bridgeDoor.interface.encodeFunctionData("pause"), "0");
                    expect(await bridgeDoor.paused()).to.equal(true);
                    await safe.execTransactionFromModule(bridgeDoor.address, 0, bridgeDoor.interface.encodeFunctionData("unpause"), "0");
                    expect(await bridgeDoor.paused()).to.equal(false);
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
        it("Only owner should be able to pause or unpause contract", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, safe, witnesses }) => {
                    await expect(bridgeDoor.connect(users[0]).pause()).to.be.revertedWith("Ownable: caller is not the owner");
                    await expect(bridgeDoor.connect(witnesses[0]).pause()).to.be.revertedWith("Ownable: caller is not the owner");
                    await safe.execTransactionFromModule(bridgeDoor.address, 0, bridgeDoor.interface.encodeFunctionData("pause"), "0");
                    await expect(bridgeDoor.connect(users[0]).unpause()).to.be.revertedWith("Ownable: caller is not the owner");
                    await expect(bridgeDoor.connect(witnesses[0]).unpause()).to.be.revertedWith("Ownable: caller is not the owner");
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
        it("Owner should be able to execute call", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, safe }) => {
                    await ethers.provider.send("hardhat_setBalance", [bridgeDoor.address, "0x20"]);
                    const initialUserBalance = await users[0].getBalance();
                    await safe.execTransactionFromModule(
                        bridgeDoor.address,
                        0,
                        bridgeDoor.interface.encodeFunctionData("execute", [users[0].address, 32, [], "0"]),
                        "0",
                    );
                    expect(await users[0].getBalance()).to.equal(initialUserBalance.add(32));
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
        it("Only owner should be able to execute call", async () => {
            await withFixtures(
                async ({ bridgeDoor, users, witnesses }) => {
                    await expect(bridgeDoor.connect(users[0]).execute(users[0].address, 32, [], "0")).to.be.revertedWith(
                        "Ownable: caller is not the owner",
                    );
                    await expect(bridgeDoor.connect(witnesses[0]).execute(users[0].address, 32, [], "0")).to.be.revertedWith(
                        "Ownable: caller is not the owner",
                    );
                },
                [BridgeType.NATIVE, BridgeType.ISSUING_TOKEN, BridgeType.LOCKING_TOKEN],
            );
        });
    });
});
