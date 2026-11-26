const jwt = require("../services/jwt");

const unProtectedRoutes = {
  "/user": {
    methods: { post: true },
  },
  "/user/login": {
    methods: { post: true },
  },
  "/user/register": {
    methods: { post: true },
  },
  "/user/totp/verify-login": {
    methods: { post: true },
  },
  "/cleaning-packing/pdf": {
    methods: { get: true },
  },
};

async function auth(req, res, next) {
  // Allow static files from views folder (PDFs) - check multiple variations
  const isStaticFile =
    req.path.startsWith("/views/") ||
    req.originalUrl.startsWith("/views/") ||
    req.baseUrl.startsWith("/views/") ||
    (req.baseUrl + req.path).startsWith("/views/");

  if (isStaticFile) {
    next();
    return;
  }

  // Check multiple path variations
  const pathsToCheck = [
    req.path,
    req.baseUrl,
    req.originalUrl,
    req.baseUrl + req.path,
  ];

  const isUnprotected = pathsToCheck.some(
    (path) =>
      unProtectedRoutes[path] &&
      unProtectedRoutes[path]["methods"][req.method.toLowerCase()]
  );

  if (isUnprotected) {
    next();
    return;
  }

  try {
    const token = req.headers["x-access-token"];

    if (token === undefined) {
      res.json({ code: 403, msg: "Access Denied" });
      res.end();
      return;
    } else {
      const decoded = await jwt.verify(token);

      req.decoded = {};
      req.decoded.user_id = decoded.user_id;
      req.decoded.employee_id = decoded.employee_id;
      req.decoded.user_type = decoded.user_type;
      req.decoded.branch_id = decoded.branch_id;

      // if (decoded.role !== "ADMIN") {
      //   res.json({ code: 403, msg: "Access Denied" });
      //   res.end();
      //   return;
      // }
    }
  } catch (err) {
    res.json({ code: 403, msg: "Access Denied" });
    res.end();
    return;
  }

  next();
}

module.exports = auth;
