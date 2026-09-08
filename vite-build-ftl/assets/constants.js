export default {
  GLOBAL_OBJECT: "mallCloud",
  CDN_DOMAIN: "mall-cloud",
  COMPONENT_PREFIX: "cloud_",
  GLOBAL_COMPONENTS_FOLDER: "_global",
  COMMON_COMPONENTS_FOLDER: "_common",
  COMPONENT_INFO_FILE: "info.json",
  LOGIN_API: "/api/mall-cloud/auth",
  TOKEN_API: "/api/mall-cloud/token",
  VERSION_API: "/api/mall-cloud/info/save",
  YOUZANYUN_HOST: "diy.youzanyun.com",
  YOUZANYUN_BASEURL: "https://diy.youzanyun.com",
  MESSAGE: {
    CHECK: {
      SCOPE: "用户校验",
      GIT: "开始检查代码信息",
      USER: "开始验证用户信息",
      FAIL: "验证失败",
      SUCCESS: "验证成功"
    },
    DEV: {
      SCOPE: "开发模式",
      START: "开启中",
      BUILD_SUCCESS: "启动完毕，请用浏览器打开 %s 查看"
    },
    BUILD: {
      SCOPE: "文件构建",
      START: "开始打包",
      FAIL: "打包失败",
      SUCCESS: "打包成功"
    },
    CDN: {
      SCOPE: "文件上传",
      START: "[1/3] - 开始准备上传",
      UPLOADING: "[2/3] - 文件上传中",
      FAIL: "[3/3] - 文件上传失败",
      SUCCESS: "[3/3] - 文件上传成功"
    },
    INFO: {
      SCOPE: "保存组件信息",
      START: "开始上传组件信息",
      FAIL: "保存组件信息失败",
      SUCCESS: "保存组件信息成功"
    },
    NO_APP_NAME: "未获取到 appName，确认 config.json 中的 appName 字段是否正确",
    INPUT_VERSION: "请输入本次发布的版本号：",
    INPUT_COMMENT: "请输入本次发布版本的描述：",
    INPUT_USERNAME: "请输入username(手机号)：",
    INPUT_PASSWORD: "请输入password(GitToken)："
  }
};
