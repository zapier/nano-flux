'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var exists = function exists(obj) {
  return obj !== null && typeof obj !== 'undefined';
};

exports['default'] = function (Component, storeKeys, stateFn) {

  var checkFluxProp = function checkFluxProp(props) {
    if (!exists(props.flux)) {
      throw new Error('Must pass flux object on props for connectToStores.');
    }
    if (typeof props.flux.stores !== 'object') {
      throw new Error('Flux object must have stores.');
    }
  };

  var storesFromKeys = function storesFromKeys(props) {
    checkFluxProp(props);

    var stores = {};
    storeKeys.forEach(function (storeKey) {
      stores[storeKey] = props.flux.stores[storeKey];
    });
    return stores;
  };

  var ConnectToStores = (function (_React$Component) {
    var _class = function ConnectToStores(props, context) {
      _classCallCheck(this, _class);

      _get(Object.getPrototypeOf(_class.prototype), 'constructor', this).call(this, props, context);

      var stores = storesFromKeys(props);

      this.state = {
        stores: stores,
        props: stateFn(stores, props)
      };

      this.onStoreChanged = this.onStoreChanged.bind(this);
    };

    _inherits(_class, _React$Component);

    _createClass(_class, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        var _this = this;

        storeKeys.forEach(function (storeKey) {
          _this.state.stores[storeKey].on('change', _this.onStoreChanged);
        });
      }
    }, {
      key: 'onStoreChanged',
      value: function onStoreChanged() {
        this.setState({
          props: stateFn(this.state.stores, this.props)
        });
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        var _this2 = this;

        storeKeys.forEach(function (storeKey) {
          var store = _this2.state.stores[storeKey];
          store.off('change', _this2.onStoreChanged);
        });
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2['default'].createElement(Component, _extends({}, this.props, this.state.props));
      }
    }]);

    return _class;
  })(_react2['default'].Component);

  return ConnectToStores;
};

module.exports = exports['default'];