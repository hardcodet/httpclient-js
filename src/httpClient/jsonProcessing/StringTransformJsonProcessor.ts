import {IJsonProcessor} from "./IJsonProcessor";

/**
 * Processes all string values in a given JSON document and potentially
 * transforms them according to an injected transformer function.
 */
export class StringTransformJsonProcessor implements IJsonProcessor {

    /**
     *
     * @param transformerFunc Transformer function which evaluates and potentially
     * transforms any string values. Return undefined in the transformer to leave
     * the value intact.
     * Prototypical usage here is to transform ISO date strings into Date objects.
     */
    constructor(private transformerFunc: (value: string) => any) {
    }

    _isArray(obj): boolean {
        return Array.isArray(obj);
    }

    _isObject(obj): boolean {
        return obj === Object(obj);
    }

    processJson(json: object): object {
        // trigger recursive parsing
        this.parse(json);
        return json;
    }

    /**
     * Recursively parses a JSON document while submitting
     * all string values to the injected transformer function.
     * @param json The JSON object to parse.
     */
    private parse(json: object) {
        if (!this._isObject(json)) {
            // abort if it's not an object
            return;
        }

        Object.keys(json).forEach((key) => {
            const value: any = json[key];

            // recurse each element in an array
            if (this._isArray(value)) {
                for (const item of value) {
                    this.parse(item);
                }
                return;
            }

            // if it's a string, evaluate and potentially replace
            if (typeof value === "string") {
                // delegate to transformer
                const transformed = this.transformerFunc(value);

                if (transformed !== undefined) {
                    // replace (also if null was returned)
                    json[key] = transformed;
                }

                // we're done here (no need for recursion, it is/was a string)
                return;
            }

            // recurse
            this.parse(value);
        });
    }
}
