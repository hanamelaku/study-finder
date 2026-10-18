exports.notFound = (req, res) => {
  res.status(404).json({ error: 'route not found' });
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'server error' });
};