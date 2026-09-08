import { MockListItem, MockListParams } from "./mock-model";
import List from "./model/List";
import { createRequest } from "@/api/req-utils";

export const fetchMockList = createRequest<MockListParams, List<MockListItem>>(
  (data) => ({
    url: "/api/list",
    method: "POST",
    data,
  }),
);

export const execDml = createRequest<any, any>((data) => ({
  url: "/api/rds/exec-dml?",
  method: "POST",
  data,
}));
