import { AnyObject } from "@swisstype/essential";

export type CreateReplacerOptions<V> = {
    parser?: (value: V) => any;
};

export default function createReplacer<M extends AnyObject, P extends keyof M, V>(
    module: M,
    property: P,
    value: V,
    { parser }: CreateReplacerOptions<V> = {
        parser: (value) => value,
    },
): { new (value?: V): jest.ReplaceProperty<M[P]> } {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return function replace(customValue: V = value) {
        return jest.replaceProperty(module, property, parser(value) as M[P]);
    } as unknown as {
        new (value?: V): jest.ReplaceProperty<M[P]>;
    };
}
