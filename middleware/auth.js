module.exports = {
  ensureAuth: function(req, res, next){
    if(req.session && req.session.user) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  },
  ensureRole: function(roles){
    return function(req, res, next){
      if(!req.session || !req.session.user) return res.status(401).json({ error: 'Unauthorized' });
      if(roles.includes(req.session.user.privilege)) return next();
      return res.status(403).json({ error: 'Forbidden' });
    };
  }
};
