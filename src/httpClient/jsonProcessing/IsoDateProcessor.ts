import {StringTransformJsonProcessor} from "./StringTransformJsonProcessor";


/**
 * Parses ISO dates, which are just strings in JSON. Should do for most use cases. If you have
 * more complex scenarios, consider just using StringTransformJsonProcessor along with a library
 * such a luxon or date-fns.
 */
export class IsoDateProcessor extends StringTransformJsonProcessor {

    private static iso8601 = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/


    /**
     * Parses all strings that match an ISO8601 date (e.g. 2019-12-31T23:59:59Z) into Date instances.
     */
    constructor() {
        super(IsoDateProcessor.transformIsoDate);
    }

    static transformIsoDate(value: string) {
        // check if it's a valid ISO-8601 timestamp
        // -> this is super fast, so typically no need to worry about performance
        const result: boolean = IsoDateProcessor.iso8601.test(value);
        if (result) {
            // parse date
            return new Date(Date.parse(value))
        }

        // not an ISO date -> no transformation
        return undefined;
    }
}
