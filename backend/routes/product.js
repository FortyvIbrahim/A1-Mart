const router = require("express").Router();
const Joi = require("@hapi/joi");
const respondError = require("../utils/http");

class ProductRoutes {
  constructor(productUsecase, designationsUsecase, synker) {
    this.productUsecase = productUsecase;
    this.designationsUsecase = designationsUsecase;
    this.synker = synker;

    this.init();
  }

  init() {
    router.post("/sync", async (req, res) => {
      try {
        if (!this.synker || typeof this.synker.syncProducts !== "function") {
          res.json({ code: 500, msg: "Product sync service is unavailable" });
          res.end();
          return;
        }
        const data = await this.synker.syncProducts();
        res.json({
          code: 200,
          msg: "Product sync completed",
          data,
        });
      } catch (err) {
        console.log(err);
        res.json({
          code: 500,
          msg: err.message || "Product sync failed",
        });
      }
      res.end();
    });

    router.post("/bulk", async (req, res) => {
      try {
        const schema = {
          products: Joi.array().items(Joi.object().unknown(true)).min(1).required(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const result = await this.productUsecase.bulkCreate(req.body.products);
        res.json({ code: 200, data: result });
      } catch (err) {
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          console.log(err);
          res.json({ code: 500, msg: err.message });
        }
      }
      res.end();
    });

    router.put("/bulk-image-url", async (req, res) => {
      try {
        const schema = {
          items: Joi.array()
            .items(
              Joi.object({
                product_id: Joi.number().integer().required(),
                image_url: Joi.string().allow(null, "").required(),
              })
            )
            .min(1)
            .required(),
        };
        const isValid = Joi.validate(req.body, schema);
        if (isValid.error !== null) throw isValid.error;

        const result = await this.productUsecase.bulkUpdateImageUrl(req.body.items);
        res.json({ code: 200, data: result });
      } catch (err) {
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          console.log(err);
          res.json({ code: 500, msg: err.message });
        }
      }
      res.end();
    });

    router.post("/", async (req, res) => {
      try {
        const product = req.body;
        // const schema = {
        //   product_id: Joi.number().required(),
        //   variant: Joi.number().optional(),
        //   variant_of: Joi.number().allow(null).optional(),
        //   gf_item_name: Joi.string().allow(null).optional(),
        //   gf_description: Joi.string().allow(null).optional(),
        //   gf_detailed_description: Joi.string().allow(null).optional(),
        //   gf_weight_grams: Joi.string().allow(null).optional(),
        //   gf_applies_online: Joi.string().allow(null).optional(),
        //   gf_item_product_type: Joi.string().allow(null).optional(),
        //   gf_manufacturer: Joi.string().allow(null).optional(),
        //   gf_food_type: Joi.string().allow(null).optional(),
        //   gf_tax_id: Joi.number().allow(null).optional(),
        //   gf_status: Joi.string().allow(null).optional(),
        //   de_distributor: Joi.string().allow(null).optional(),
        //   brand_id: Joi.number().allow(null).optional(),
        //   category_id: Joi.number().allow(null).optional(),
        //   subcategory_id: Joi.number().allow(null).optional(),
        //   measure: Joi.string().allow(null).optional(),
        //   measure_in: Joi.string().allow(null).optional(),
        //   packaging_type: Joi.string().allow(null).optional(),
        //   cleaning: Joi.number().allow(null).optional(),
        //   sticker: Joi.number().allow(null).optional(),
        //   grinding: Joi.number().allow(null).optional(),
        //   cover_type: Joi.string().allow(null).optional(),
        //   cover_sizes: Joi.string().allow(null).optional(),
        //   return_prod: Joi.number().allow(null).optional(),
        //   de_display_name: Joi.string().allow(null).optional(),
        //   department_id: Joi.number().allow(null).optional(),
        //   de_name: Joi.string().allow(null).optional(),
        //   de_packaging_type: Joi.string().allow(null).optional(),
        //   de_preparation_type: Joi.string().allow(null).optional(),
        //   de_combo_name: Joi.string().allow(null).optional(),
        //   de_buyer_name: Joi.string().allow(null).optional(),
        //   image_url: Joi.string().allow(null).optional(),
        // };
        // const isValid = Joi.validate(product, schema);
        // if (isValid.error !== null) {
        //   throw isValid.error;
        // }
        const response = await this.productUsecase.create(product);

        res.json(response);
      } catch (err) {
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          console.log(err);
          res.json({ code: 500, msg: err.message });
        }
      }

      res.end();
    });

    router.get("/all", async (req, res) => {
      try {
        const includeStockPrice =
          req.query.include_stock_price === "1" ||
          req.query.include_stock_price === "true";
        const ignoreBranchCheck =
          req.query.ignore_branch_check === "1" ||
          req.query.ignore_branch_check === "true";

        let branchId = req.decoded?.branch_id || null;

        if (includeStockPrice) {
          if (ignoreBranchCheck) {
            branchId = null;
          } else if (branchId && this.designationsUsecase) {
            const isAllBranchAllowedRes =
              await this.designationsUsecase.checkPermissions(
                req.decoded.employee_id,
                ["access_all_branches"]
              );

            if (isAllBranchAllowedRes.hasAllPermissions) {
              branchId = null;
            }
          }
        }

        const products = await this.productUsecase.getAllProductData(
          includeStockPrice,
          branchId
        );
        res.json(products);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }
      res.end();
    });

    router.get("/product_id", async (req, res) => {
      try {
        const schema = {
          product_id: Joi.string().required(),
          include_stock_price: Joi.boolean().default(false).optional(),
          ignore_branch_check: Joi.boolean().default(false).optional(),
        };
        const query = req.query;
        const isValid = Joi.validate(query, schema);
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const includeStockPrice =
          query.include_stock_price === "1" ||
          query.include_stock_price === "true";
        const ignoreBranchCheck =
          query.ignore_branch_check === "1" ||
          query.ignore_branch_check === "true";

        let branchId = req.decoded?.branch_id || null;

        if (includeStockPrice) {
          if (ignoreBranchCheck) {
            branchId = null;
          } else if (branchId && this.designationsUsecase) {
            const isAllBranchAllowedRes =
              await this.designationsUsecase.checkPermissions(
                req.decoded.employee_id,
                ["access_all_branches"]
              );

            if (isAllBranchAllowedRes.hasAllPermissions) {
              branchId = null;
            }
          }
        }

        const data = await this.productUsecase.getProductById(
          query.product_id,
          includeStockPrice,
          branchId
        );
        res.json(data);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }

      res.end();
    });

    router.get("/departments", async (req, res) => {
      try {
        const departments = await this.productUsecase.getAllDepartments();
        res.json(departments);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }
      res.end();
    });

    router.get("/categories", async (req, res) => {
      try {
        const categories = await this.productUsecase.getAllCategories();
        res.json(categories);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }
      res.end();
    });

    router.get("/subcategories", async (req, res) => {
      try {
        const subcategories = await this.productUsecase.getAllSubcategories();
        res.json(subcategories);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }
      res.end();
    });

    router.get("/brands", async (req, res) => {
      try {
        const brands = await this.productUsecase.getAllBrands();
        res.json(brands);
      } catch (err) {
        console.log(err);
        if (err.name === "ValidationError") {
          res.json({ code: 422, msg: err.toString() });
        } else {
          res.json({ code: 500, msg: "An error occurred !" });
        }
      }
      res.end();
    });

    router.put("/:product_id", async (req, res) => {
      try {
        const product_id = parseInt(req.params.product_id);
        if (isNaN(product_id)) {
          throw new Error("Invalid product_id");
        }

        const schema = {
          image_url: Joi.string().allow(null).optional(),
        };

        const body = req.body;
        const isValid = Joi.validate(body, schema);
        if (isValid.error !== null) {
          throw isValid.error;
        }

        const response = await this.productUsecase.updateImageUrl(
          product_id,
          body.image_url
        );
        res.json(response);
      } catch (err) {
        respondError(res, err);
      }
      res.end();
    });
  }
  getRouter() {
    return router;
  }
}

module.exports = (productUsecase, designationsUsecase, synker) => {
  return new ProductRoutes(productUsecase, designationsUsecase, synker);
};
