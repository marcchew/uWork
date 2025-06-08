// Authentication middleware
function checkAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view this resource');
  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

function checkUserType(type) {
  return (req, res, next) => {
    if (req.session.user && req.session.user.user_type === type) {
      return next();
    }
    req.flash('error_msg', 'You do not have permission to access this resource');
    res.redirect('/dashboard');
  };
}

export { checkAuthenticated, checkNotAuthenticated, checkUserType };