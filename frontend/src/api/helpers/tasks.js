import axiosInstance from "..";

export const getTasks = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/tasks`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getMyTasks = () => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/tasks/my`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTaskById = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/tasks/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTask = (body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/tasks`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const updateTask = (id, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .put(`/tasks/${id}`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const deleteTask = (id) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .delete(`/tasks/${id}`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getTaskComments = (taskId) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .get(`/tasks/${taskId}/comments`)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const createTaskComment = (taskId, body) => {
  return new Promise(function (resolve, reject) {
    axiosInstance
      .post(`/tasks/${taskId}/comments`, body)
      .then(async (res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
