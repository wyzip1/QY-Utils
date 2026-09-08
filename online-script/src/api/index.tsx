import { createRequest } from "@/api/utils/req-utils";

export const postServerRunCode = createRequest((value: string) => ({
  url: "/script/groovy/exec",
  method: "POST",
  data: value,
  headers: {
    SecretKey: "112345678",
    "Content-Type": "text/plain",
  },
}));
