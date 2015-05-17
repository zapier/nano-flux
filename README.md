# NanoFlux

Just a tiny wrapper around Facebook's flux dispatcher.

- Hardly any code.
- No classes, no use of `this`. Actions creators are just functions. Stores are
  simple factory functions that return handlers.
- No need to specify action creators that just pass through to store handlers.
  Having a store that specifies a handler implies an action creator that
  dispatches a matching action.
- No singletons. The NanoFlux factory function creates your stores and action
  creators and wraps them up in a flux instance for you. Nice for testing or
  isomorphic apps or just plain clean code.

## Implicit actions

If your action is just passing through to the store, you can forget all the
boilerplate!

```js
import Flux from 'nano-flux';

// You specify a store with a factory function that takes a private store
// object as a parameter.
const createMessageStore = (store) => {

  // Setting the state here won't fire any events, so feel free to use
  // `setState` function for initialization.
  store.setState({
    messages: []
  });

  // Return handlers to listen for dispatched actions. `onAddMessage` will
  // listen for 'addMessage' actions.
  return {

    onAddMessage(content) {
      // Using `setState` will automatically cause the store to emit a change
      // event.
      store.setState({
        messages: store.state.messages.concat(content)
      });
    }
  }
};

// Create a flux instance.
const flux = Flux.create({
  stores: {
    // The key becomes the namespace for the store.
    message: createMessageStore
  }
});

// Listen for change events on the store.
flux.stores.message.on('change', (state) => {
  console.log('Messages:', state.messages);
});
```

## Explicit actions

If your action needs to do a bit of work before dispatching, it's easy to add
explict action creators.

```js
import Flux from 'nano-flux';

// Action creators are specified by simple objects with functions.
const messageActions = {

  // Each action creator function is passed a `dispatch` function bound to that
  // action.
  addMessage(dispatch, content) {
    const cid = (new Date()).getTime();
    // Dispatch signatures match the signature of the store's handlers.
    dispatch(cid, content);
  }

};

const createStore = (store) => {

  store.setState({
    messages: []
  });

  return {

    onAddMessage(cid, content) {
      store.setState({
        messages: store.state.messages.concat({
          cid: cid,
          content: content
        })
      });
    }
  }
};

const flux = Flux.create({
  actions: {
    // The key becomes the namespace for the actions.
    message: messageActions
  }
  stores: {
    message: createStore
  }
});

flux.stores.message.on('change', (state) => {
  console.log('Messages:', state.messages);
});
```
