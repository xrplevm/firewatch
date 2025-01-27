export type PrecompileConfig<T> = {
    abi: string[]
    contractAddress: string
} & T