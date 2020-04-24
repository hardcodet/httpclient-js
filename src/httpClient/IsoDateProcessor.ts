import { parseISO } from "date-fns";
import { IJsonProcessor } from "./IJsonProcessor";

/**
 * Parses ISO dates, which are just strings in JSON.
 */
export class IsoDateProcessor implements IJsonProcessor {
    private static isArray(obj): boolean {
        return Array.isArray(obj);
    }

    private static isObject(obj): boolean {
        return obj === Object(obj);
    }
    private iso8601 = /^\d{4}(-\d\d(-\d\d(T\d\d:\d\d(:\d\d)?(\.\d+)?(([+-]\d\d:\d\d)|Z)?)?)?)?$/i;

    public processJson<T extends object = object>(json: T): T {
        this.parse(json);
        return json;
    }

    private parse(json: object) {
        if (!IsoDateProcessor.isObject(json)) {
            // abort if it's not an object
            return;
        }

        Object.keys(json).forEach((key) => {
            const value: any = json[key];

            // browse arrays
            if (IsoDateProcessor.isArray(value)) {
                for (const item of value) {
                    this.parse(item);
                }
                return;
            }

            // if it's a string, check for convention
            if (typeof value === "string") {
                // check if it's a valid ISO-8601 timestamp
                // -> this is super fast, so no need to worry about performance
                const result: boolean = this.iso8601.test(value);
                if (result) {
                    // parse date (rely on date-fns)
                    json[key] = parseISO(value);
                }

                // no recursion, it's a string
                return;
            }

            // recurse
            this.parse(value);
        });
    }
}
