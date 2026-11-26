const DEFAULT_INSERT_BATCH_SIZE = 15000;
const DEFAULT_UPDATE_BATCH_SIZE = 500;

function queryAsync(connection, sql, params) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function getConnectionAsync(db) {
  return new Promise((resolve, reject) => {
    db.getConnection((err, connection) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });
}

function beginTransactionAsync(connection) {
  return new Promise((resolve, reject) => {
    connection.beginTransaction((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function commitAsync(connection) {
  return new Promise((resolve, reject) => {
    connection.commit((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function rollbackAsync(connection) {
  return new Promise((resolve, reject) => {
    connection.rollback(() => resolve());
  });
}

function insertRowsInBatches(
  connection,
  insertSql,
  rows,
  batchSize = DEFAULT_INSERT_BATCH_SIZE
) {
  return new Promise((resolve, reject) => {
    if (!rows || rows.length === 0) {
      resolve(0);
      return;
    }

    let index = 0;
    let inserted = 0;

    const runNext = () => {
      if (index >= rows.length) {
        resolve(inserted);
        return;
      }

      const chunk = rows.slice(index, index + batchSize);
      index += batchSize;
      inserted += chunk.length;

      connection.query(insertSql, [chunk], (err) => {
        if (err) {
          reject(err);
          return;
        }
        runNext();
      });
    };

    runNext();
  });
}

async function updateProductHoldingDaysInBatches(
  connection,
  productHoldingDaysUpdates,
  batchSize = DEFAULT_UPDATE_BATCH_SIZE
) {
  const entries = Array.from(productHoldingDaysUpdates.entries());
  if (entries.length === 0) return;

  for (let i = 0; i < entries.length; i += batchSize) {
    const chunk = entries.slice(i, i + batchSize);
    const whenClauses = chunk.map(() => "WHEN ? THEN ?").join(" ");
    const ids = chunk.map(([productId]) => productId);
    const params = [];
    chunk.forEach(([productId, holdingDays]) => {
      params.push(productId, holdingDays);
    });
    params.push(...ids);

    await queryAsync(
      connection,
      `UPDATE products
       SET holding_days = CASE product_id ${whenClauses} END
       WHERE product_id IN (?)`,
      params
    );
  }
}

module.exports = {
  DEFAULT_INSERT_BATCH_SIZE,
  DEFAULT_UPDATE_BATCH_SIZE,
  insertRowsInBatches,
  updateProductHoldingDaysInBatches,
  queryAsync,
  getConnectionAsync,
  beginTransactionAsync,
  commitAsync,
  rollbackAsync,
};
