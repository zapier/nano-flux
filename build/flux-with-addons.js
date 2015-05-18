'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _flux = require('./flux');

var _flux2 = _interopRequireDefault(_flux);

var _addonsConnectToStores = require('./addons/connect-to-stores');

var _addonsConnectToStores2 = _interopRequireDefault(_addonsConnectToStores);

var _addonsInjectActions = require('./addons/inject-actions');

var _addonsInjectActions2 = _interopRequireDefault(_addonsInjectActions);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var NanoFlux = (0, _objectAssign2['default'])({}, _flux2['default']);

NanoFlux.addons = {
  connectToStores: _addonsConnectToStores2['default'],
  injectActions: _addonsInjectActions2['default']
};

exports['default'] = NanoFlux;
module.exports = exports['default'];