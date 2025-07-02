import { coins } from "@cosmjs/proto-signing";
import { assertIsDeliverTxSuccess } from "@cosmjs/stargate";
import config from "../../../module.config.json";
import {
    extractPacketSequenceFromLogs,
    formatIBCTestname,
    loadIbcChain,
    verifyIbcPacketAcknowledgement,
    calculateTimeoutHeight,
    calculateTimeoutTimestamp,
} from "../../../src/modules/ibc/utils";
import { expect } from "chai";
import { polling } from "@shared/utils";
import { describeOrSkip } from "@testing/mocha/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { Chain } from "@firewatch/core/chain";

describeOrSkip(
    "IBCModule",
    () => {
        return (
            isChainType(["cosmos"], config.network as unknown as Chain) &&
            isChainEnvironment(["testnet", "mainnet"], config.network as unknown as Chain)
        );
    },
    () => {
        const { ibc: ibcConfig } = config;

        for (const chainPair of ibcConfig.chains) {
            describe(formatIBCTestname(chainPair), () => {
                const { srcChain, dstChain } = chainPair;

                let srcClient: any;
                let srcSender: string;
                let dstClient: any;
                let dstSender: string;

                before(async () => {
                    const srcChainData = await loadIbcChain(srcChain);
                    const dstChainData = await loadIbcChain(dstChain);

                    srcClient = srcChainData.client;
                    srcSender = srcChainData.sender;
                    dstClient = dstChainData.client;
                    dstSender = dstChainData.sender;

                    console.log("srcSender", srcSender);
                    console.log("dstSender", dstSender);
                });

                it(`should transfer ${srcChain.amount} ${srcChain.denom} from ${srcChain.chainId} to ${dstChain.chainId}`, async () => {
                    // Calculate dynamic timeout height and timestamp
                    const timeoutHeight = await calculateTimeoutHeight(dstClient, 1000);
                    const timeoutTimestamp = calculateTimeoutTimestamp(10); // 10 minutes

                    const result = await srcClient.sendIbcTokens(
                        srcSender,
                        dstSender,
                        {
                            denom: srcChain.denom,
                            amount: srcChain.amount,
                        },
                        "transfer",
                        srcChain.channel,
                        timeoutHeight,
                        timeoutTimestamp,
                        {
                            amount: coins(srcChain.gas.amount, srcChain.denom),
                            gas: srcChain.gas.gas,
                        },
                    );

                    assertIsDeliverTxSuccess(result);

                    const txDetails = await srcClient.getTx(result.transactionHash);
                    const sequence = extractPacketSequenceFromLogs(txDetails.events);

                    expect(sequence).to.not.equal(undefined);

                    const isPacketReceived = await polling(
                        async () => await verifyIbcPacketAcknowledgement(dstClient, dstChain.channel, sequence!),
                        (res) => !res,
                        {
                            delay: 10000,
                            maxIterations: 12,
                        },
                    );
                    expect(isPacketReceived).to.equal(true);
                });

                it(`should transfer ${dstChain.amount} ${dstChain.denom} from ${dstChain.chainId} to ${srcChain.chainId}`, async () => {
                    const timeoutHeight = await calculateTimeoutHeight(srcClient, 1000);
                    const timeoutTimestamp = calculateTimeoutTimestamp(10); // 10 minutes

                    const result = await dstClient.sendIbcTokens(
                        dstSender,
                        srcSender,
                        {
                            denom: dstChain.denom,
                            amount: dstChain.amount,
                        },
                        "transfer",
                        dstChain.channel,
                        timeoutHeight,
                        timeoutTimestamp,
                        {
                            amount: coins(dstChain.gas.amount, dstChain.denom),
                            gas: dstChain.gas.gas,
                        },
                    );

                    assertIsDeliverTxSuccess(result);

                    const txDetails = await dstClient.getTx(result.transactionHash);
                    const sequence = extractPacketSequenceFromLogs(txDetails.events);

                    expect(sequence).to.not.equal(undefined);

                    const isPacketReceived = await polling(
                        async () => await verifyIbcPacketAcknowledgement(srcClient, srcChain.channel, sequence!),
                        (res) => !res,
                        {
                            delay: 10000,
                            maxIterations: 12,
                        },
                    );
                    expect(isPacketReceived).to.equal(true);
                });
            });
        }
    },
);
