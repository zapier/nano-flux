import BaseFlux from 'flux';
import EventEmitter from 'eventemitter3';
import assign from 'object-assign';

const NanoFlux = {

  // Given a config with actions/store setup functions, return a flux thingy.
  create(config = {}) {

    // Use Facebook's dispatcher, but we'll skip the boilerplate constants
    // and dispatcher tokens.
    const dispatcher = new BaseFlux.Dispatcher();
    // Registry of stores.
    const stores = {};
    // Registry of action creators.
    const actions = {};
    // Registry of dispatchers.
    const dispatchers = {};
    // Emitter for listening to flux events.
    const fluxEmitter = new EventEmitter();

    const fluxDispatch = (payload) => {
      dispatcher.dispatch(payload);
      fluxEmitter.emit('dispatch', payload);
    };

    // Setup action creators, given a namespace and setup function.
    const setupActions = (actionsKey, setupFn) => {

      // Accept an object or a function to setup action creators.
      if (typeof setupFn === 'object') {
        const setupObj = setupFn;

        setupFn = () => {
          return setupObj;
        };
      }

      // Add the namespace to the actions registry.
      actions[actionsKey] = {};

      // Create a map of all dispatchers for this namespace in case an action
      // creator needs to dispatch a differently named action.
      dispatchers[actionsKey] = {};

      // Call the setup function to get the action creator functions.
      const actionCreators = setupFn(actions[actionsKey]);

      // Add each action creator to the registry.
      Object.keys(actionCreators).forEach((actionKey) => {

        // Create a custom dispatch funtion tied to this action.
        const dispatch = (...args) => {
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

        let actionCreator = actionCreators[actionKey];
        // Allow shortcut of true to mean self-dispatch.
        if (actionCreator === true) {
          actionCreator = (myDispatch, ...args) => {
            myDispatch.to[actionKey](...args);
          };
        }
        // Allow shortcut of string to mean dispatch to that action.
        if (typeof actionCreator === 'string') {
          const delegateActionName = actionCreator;
          actionCreator = (myDispatch, ...args) => {
            myDispatch.to[delegateActionName](...args);
          };
        }

        // The public action function gets bound to the custom dispatch function.
        actions[actionsKey][actionKey] = (...args) => {
          actionCreator(dispatch, ...args);
        };
      });
    };

    // Loop through all the actions namespaces and setup the action creators.
    Object.keys(config.actions || {}).forEach((actionsKey) => {
      setupActions(actionsKey, config.actions[actionsKey]);
    });

    // Create the private store object, used only inside a store.
    const createPrivateStore = (onStateChange) => {

      // Keeping the emitter internal so nothing can emit through it.
      const emitter = new EventEmitter();
      // State is sort of private. This is the source of truth, and if you
      // overwrite it, you'll lose changes in the next setState.
      let state = {};
      // Expose state.
      const store = {
        state: state
      };
      // Just a flag to mark whether to emit events yet.
      let isSetStateActive = false;

      const setState = (newState) => {
        state = assign({}, state, newState);
        // Expose the current state.
        store.state = state;
        onStateChange(state);
        if (isSetStateActive) {
          emitter.emit('change', state);
        }
      };

      // setState is turned off during setup, so need a way to activate it.
      const activateSetState = () => {
        isSetStateActive = true;
      };

      // waitFor works with store keys, rather than tokens.
      const waitFor = (storeKeys) => {
        if (typeof storeKeys === 'string') {
          storeKeys = [storeKeys];
        }
        // Convert store keys to tokens.
        const tokens = storeKeys.map((storeKey) => {
          return stores[storeKey].dispatchToken;
        });
        return dispatcher.waitFor(tokens);
      };

      return assign(store, {
        setState,
        emitter,
        waitFor,
        stores,
        activateSetState
      });
    };

    // Among a set of internal store handlers, find the one matching for an
    // actions namespace and action.
    const findHandler = (handlers, storeKey, {actionsKey, actionKey}) => {

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
    const addPlaceholderActions = (storeKey, handlers, actionsKey) => {
      actionsKey = actionsKey || storeKey;

      let canCreatePlaceholderActions = false;

      if (!actions[actionsKey]) {
        dispatchers[actionsKey] = {};
        actions[actionsKey] = {};
        // Only create placeholder actions if no actions were created for this namespace.
        canCreatePlaceholderActions = true;
      }

      Object.keys(handlers).forEach((key) => {
        if (typeof handlers[key] === 'function') {

          // Make sure a dispatcher exists for this action.
          if (!dispatchers[actionsKey][key]) {
            const dispatch = (...args) => {
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
              const dispatch = dispatchers[actionsKey][key];
              actions[actionsKey][key] = (...args) => {
                dispatch(...args);
              };
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
    const setupStore = (storeKey, setupFn) => {

      const publicStore = {};
      // Create the private store and pass a handler for when state changes.
      const privateStore = createPrivateStore((state) => {
        // Expose the state publicly.
        publicStore.state = state;
      });
      // Get all the handlers for the store.
      const handlers = setupFn(privateStore);
      // Now state transitions can fire events.
      publicStore.state = privateStore.state;
      privateStore.activateSetState();

      // Get a dispatch token for this store and register for actions.
      const dispatchToken = dispatcher.register((payload) => {

        const handler = findHandler(handlers, storeKey, payload);

        if (handler) {
          const newState = handler.apply(handlers, payload.args);
          if (typeof newState !== 'undefined') {
            privateStore.setState(newState);
          }
        }
      });

      addPlaceholderActions(storeKey, handlers);

      // Expose public store.
      stores[storeKey] = assign(publicStore, {
        on: privateStore.emitter.on.bind(privateStore.emitter),
        off: privateStore.emitter.off.bind(privateStore.emitter),
        once: privateStore.emitter.once.bind(privateStore.emitter),
        dispatchToken
      });

    };

    Object.keys(config.stores || {}).forEach((storeKey) => {
      setupStore(storeKey, config.stores[storeKey]);
    });

    // Expose the public flux thingy.
    return {
      dispatcher,
      stores,
      actions,
      on: fluxEmitter.on.bind(fluxEmitter),
      off: fluxEmitter.off.bind(fluxEmitter),
      once: fluxEmitter.once.bind(fluxEmitter)
    };

  }

};

export default NanoFlux;
