import { createServerFn } from "@tanstack/react-start";
import { explainInput } from "./explain-schema";
import { explainDocument } from "./explain.server";

// Nothing is persisted: the files live only in this request's memory.
export const explainDoc = createServerFn({ method: "POST" })
  .validator((data: unknown) => explainInput.parse(data))
  .handler(async ({ data }) => explainDocument(data));
