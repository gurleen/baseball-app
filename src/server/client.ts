import z from "zod";

const BASE_URL = "https://baseball-api.gurleen.net/";

export async function postRequest<TSchema extends z.ZodTypeAny>(path: string, data: any, schema: TSchema): Promise<z.infer<TSchema>> {
    const url = new URL(path, BASE_URL);
    const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: JSON.stringify(data),
    });
    const payload = await response.json();
    return schema.parse(payload);
}
