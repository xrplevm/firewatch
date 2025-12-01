import { AnyObject } from "@swisstype/essential";

export type CreateSpyOptions<V> = {
    mock: "return" | "resolve";
    accessType?: "get" | "set";
    parser?: (value: V) => any;
};

export default function createSpy<M extends AnyObject, P extends keyof M, V>(
    module: M,
    property: P,
    value: V,
    { mock, accessType, parser }: CreateSpyOptions<V> = {
        mock: "return",
        parser: (value) => value,
    },
): { new (value?: V): jest.SpyInstance<M[P]> } {
    const spyMock = mock === "return" ? "mockReturnValue" : "mockResolvedValue";
    return function spy(customValue: V = value) {
        return jest.spyOn(module, property, accessType as any)[spyMock](parser(customValue) as never);
    } as unknown as {
        new (value?: V): jest.SpyInstance<M[P]>;
    };
}
