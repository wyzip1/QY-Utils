import request from "./request";

export const uploadImage = (formData: FormData) => {
  formData.append("maxSize", (1024 * 1024 * 10).toString());
  return request<Array<string>>({
    url: "/api/v1/images",
    method: "POST",
    data: formData,
  });
};
