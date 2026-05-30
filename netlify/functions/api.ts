import serverless from "serverless-http";
import { createApp } from "../../api/app.js";

const { app } = createApp();
export const handler = serverless(app);
