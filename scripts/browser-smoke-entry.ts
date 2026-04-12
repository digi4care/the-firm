import { complete, getModel } from "@digi4care/the-firm-ai";

const model = getModel("google", "gemini-2.5-flash");
console.log(model.id, typeof complete);
