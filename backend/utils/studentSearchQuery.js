function appendSearchConditions(query, searchConditions) {
  if (query.$or) {
    query.$and = [...(query.$and || []), { $or: query.$or }, { $or: searchConditions }];
    delete query.$or;
  } else {
    query.$or = searchConditions;
  }
  return query;
}

module.exports = { appendSearchConditions };
