import axiosInstance from "..";

export const uploadAsset = (file, name, folder, type) => {
  return new Promise(function (resolve, reject) {
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("name", name);
    formData.append("folder", folder);
    formData.append("type", type == undefined ? "open" : type);
    axiosInstance
      .post("/asset", formData)
      .then(async (res) => {
        if (res.status === 200) {
          resolve(res.data);
        } else {
          reject(res.data.msg);
        }
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};
