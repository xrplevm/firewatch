import { StargateClient } from "@cosmjs/stargate";

const rpc = "http://localhost:26657";

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(rpc);
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight());
    console.log("Alice balances:", await client.getAllBalances("ethm1dakgyqjulg29m5fmv992g2y66m9g2mjn6hahwg"));
};

runAll();
