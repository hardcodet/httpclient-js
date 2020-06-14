import {StringTransformJsonProcessor} from "./StringTransformJsonProcessor";


/**
 * Parses ISO dates, which are just strings in JSON.
 */
export class IsoDateProcessor extends StringTransformJsonProcessor {

    private iso8601 = /^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/;


    /**
     * Parses all strings that match an ISO8601 date (e.g. 2019-12-31T23:59:59Z) into Date instances.
     * @param allowDateOnly Whether date string (e.g. 2019-12-31) should be transformed or not. This may be dangerous if other strings may have that value.
     */
    constructor(private allowDateOnly: boolean = false) {
        super(value => this.transformIsoDate(value));
    }

    private transformIsoDate(value: string) {
        // check if it's a valid ISO-8601 timestamp
        // -> this is super fast, so no need to worry about performance
        const result: boolean = (this.allowDateOnly || value.length > 10) && this.iso8601.test(value);
        if (result) {
            // parse date
           return new Date(Date.parse(value))
        }

        // not an ISO date -> no transformation
        return undefined;
    }
}
