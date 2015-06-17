'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _flux = require('flux');

var _flux2 = _interopRequireDefault(_flux);

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var NanoFlux = {

  // Given a config with actions/store setup functions, return a flux thingy.
  create: function create() {
    var config = arguments[0] === undefined ? {} : arguments[0];

    // Use Facebook's dispatcher, but we'll skip the boilerplate constants
    // and dispatcher tokens.
    var dispatcher = new _flux2['default'].Dispatcher();
    // Registry of stores.
    var stores = {};
    // Registry of action creators.
    var actions = {};
    // Registry of dispatchers.
    var dispatchers = {};
    // Emitter for listening to flux events.
    var fluxEmitter = new _eventemitter32['default']();

    var fluxDispatch = function fluxDispatch(payload) {
      dispatcher.dispatch(payload);
      fluxEmitter.emit('dispatch', payload);
    };

    // Setup action creators, given a namespace and setup function.
    var setupActions = function setupActions(actionsKey, setupFn) {

      // Accept an object or a function to setup action creators.
      if (typeof setupFn === 'object') {
        (function () {
          var setupObj = setupFn;

          setupFn = function () {
            return setupObj;
          };
        })();
      }

      // Add the namespace to the actions registry.
      actions[actionsKey] = {};

      // Create a map of all dispatchers for this namespace in case an action
      // creator needs to dispatch a differently named action.
      dispatchers[actionsKey] = {};

      // Call the setup function to get the action creator functions.
      var actionCreators = setupFn(actions[actionsKey]);

      // Add each action creator to the registry.
      Object.keys(actionCreators).forEach(function (actionKey) {

        // Create a custom dispatch funtion tied to this action.
        var dispatch = function dispatch() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          fluxDispatch({
            actionsKey: actionsKey,
            actionKey: actionKey,
            args: args
          });
        };

        // Add this dispatcher to the list of dispatchers for this namespace.
        dispatchers[actionsKey][actionKey] = dispatch;

        // Hang other actions off this dispatch function in case the action
        // creator needs to dispatch other actions.
        dispatch.actions = actions[actionsKey];
        dispatch.to = dispatchers[actionsKey];

        var actionCreator = actionCreators[actionKey];
        // Allow shortcut of true to mean self-dispatch.
        if (actionCreator === true) {
          actionCreator = function (myDispatch) {
            var _myDispatch$to;

            for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
              args[_key2 - 1] = arguments[_key2];
            }

            (_myDispatch$to = myDispatch.to)[actionKey].apply(_myDispatch$to, args);
          };
        }
        // Allow shortcut of string to mean dispatch to that action.
        if (typeof actionCreator === 'string') {
          (function () {
            var delegateActionName = actionCreator;
            actionCreator = function (myDispatch) {
              var _myDispatch$to2;

              for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                args[_key3 - 1] = arguments[_key3];
              }

              (_myDispatch$to2 = myDispatch.to)[delegateActionName].apply(_myDispatch$to2, args);
            };
          })();
        }

        // The public action function gets bound to the custom dispatch function.
        actions[actionsKey][actionKey] = function () {
          for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
            args[_key4] = arguments[_key4];
          }

          actionCreator.apply(undefined, [dispatch].concat(args));
        };
      });
    };

    // Loop through all the actions namespaces and setup the action creators.
    Object.keys(config.actions || {}).forEach(function (actionsKey) {
      setupActions(actionsKey, config.actions[actionsKey]);
    });

    // Create the private store object, used only inside a store.
    var createPrivateStore = function createPrivateStore(onStateChange) {

      // Keeping the emitter internal so nothing can emit through it.
      var emitter = new _eventemitter32['default']();
      // State is sort of private. This is the source of truth, and if you
      // overwrite it, you'll lose changes in the next setState.
      var state = {};
      // Expose state.
      var store = {
        state: state
      };
      // Just a flag to mark whether to emit events yet.
      var isSetStateActive = false;

      var setState = function setState(newState) {
        state = (0, _objectAssign2['default'])({}, state, newState);
        // Expose the current state.
        store.state = state;
        onStateChange(state);
        if (isSetStateActive) {
          emitter.emit('change', state);
        }
      };

      // setState is turned off during setup, so need a way to activate it.
      var activateSetState = function activateSetState() {
        isSetStateActive = true;
      };

      // waitFor works with store keys, rather than tokens.
      var waitFor = function waitFor(storeKeys) {
        if (typeof storeKeys === 'string') {
          storeKeys = [storeKeys];
        }
        // Convert store keys to tokens.
        var tokens = storeKeys.map(function (storeKey) {
          return stores[storeKey].dispatchToken;
        });
        return dispatcher.waitFor(tokens);
      };

      return (0, _objectAssign2['default'])(store, {
        setState: setState,
        emitter: emitter,
        waitFor: waitFor,
        stores: stores,
        activateSetState: activateSetState
      });
    };

    // Among a set of internal store handlers, find the one matching for an
    // actions namespace and action.
    var findHandler = function findHandler(handlers, storeKey, _ref) {
      var actionsKey = _ref.actionsKey;
      var actionKey = _ref.actionKey;

      if (storeKey === actionsKey) {

        if (handlers[actionKey]) {
          return handlers[actionKey];
        }
      }

      if (handlers[actionsKey]) {

        if (handlers[actionsKey][actionKey]) {
          return handlers[actionsKey][actionKey];
        }
      }

      return null;
    };

    // If no actions match to store handlers, just create ad-hoc actions.
    var addPlaceholderActions = function addPlaceholderActions(storeKey, handlers, actionsKey) {
      actionsKey = actionsKey || storeKey;

      var canCreatePlaceholderActions = false;

      if (!actions[actionsKey]) {
        dispatchers[actionsKey] = {};
        actions[actionsKey] = {};
        // Only create placeholder actions if no actions were created for this namespace.
        canCreatePlaceholderActions = true;
      }

      Object.keys(handlers).forEach(function (key) {
        if (typeof handlers[key] === 'function') {

          // Make sure a dispatcher exists for this action.
          if (!dispatchers[actionsKey][key]) {
            var dispatch = function dispatch() {
              for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
                args[_key5] = arguments[_key5];
              }

              fluxDispatch({
                actionsKey: actionsKey,
                actionKey: key,
                args: args
              });
            };
            dispatchers[actionsKey][key] = dispatch;
          }

          // Create stub action if allowed.
          if (canCreatePlaceholderActions) {
            if (!actions[actionsKey][key]) {
              (function () {
                var dispatch = dispatchers[actionsKey][key];
                actions[actionsKey][key] = function () {
                  for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
                    args[_key6] = arguments[_key6];
                  }

                  dispatch.apply(undefined, args);
                };
              })();
            }
          }
        } else if (typeof handlers[key] === 'object') {
          // If we have an object, the key refers to a different store, so
          // recurse to look for those.
          addPlaceholderActions(storeKey, handlers[key], key);
        }
      });
    };

    // Setup a store given a key and setup function.
    var setupStore = function setupStore(storeKey, setupFn) {

      var publicStore = {};
      // Create the private store and pass a handler for when state changes.
      var privateStore = createPrivateStore(function (state) {
        // Expose the state publicly.
        publicStore.state = state;
      });
      // Get all the handlers for the store.
      var handlers = setupFn(privateStore);
      // Now state transitions can fire events.
      publicStore.state = privateStore.state;
      privateStore.activateSetState();

      // Get a dispatch token for this store and register for actions.
      var dispatchToken = dispatcher.register(function (payload) {

        var handler = findHandler(handlers, storeKey, payload);

        if (handler) {
          handler.apply(handlers, payload.args);
        }
      });

      addPlaceholderActions(storeKey, handlers);

      // Expose public store.
      stores[storeKey] = (0, _objectAssign2['default'])(publicStore, {
        on: privateStore.emitter.on.bind(privateStore.emitter),
        off: privateStore.emitter.off.bind(privateStore.emitter),
        once: privateStore.emitter.once.bind(privateStore.emitter),
        dispatchToken: dispatchToken
      });
    };

    Object.keys(config.stores || {}).forEach(function (storeKey) {
      setupStore(storeKey, config.stores[storeKey]);
    });

    // Expose the public flux thingy.
    return {
      dispatcher: dispatcher,
      stores: stores,
      actions: actions,
      on: fluxEmitter.on.bind(fluxEmitter),
      off: fluxEmitter.off.bind(fluxEmitter),
      once: fluxEmitter.once.bind(fluxEmitter)
    };
  }

};

exports['default'] = NanoFlux;
module.exports = exports['default'];