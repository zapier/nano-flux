# NanoFlux

Just a tiny, simple wrapper around Facebook's flux dispatcher.

- Hardly any code.
- No classes, no use of `this`. Action creators are just functions. Stores are
  simple factory functions that return handlers.
- No need to specify action creators that just pass through to store handlers.
  Having a store that specifies a handler implies an action creator that
  dispatches a matching action.
- No singletons. The NanoFlux factory function creates your stores and action
  creators and wraps them up in a flux instance for you. Nice for testing or
  isomorphic apps or just plain clean code.

## Examples

### Implicit actions

If all your actions are just passing through to the store, you can forget all the
boilerplate! This is great for testing a store.

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

  // Return handlers to listen for dispatched actions.
  return {

    addMessage(content) {
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

// Dispatch an action.
flux.actions.message.addMessage('Hello, world!');
```

### Explicit actions

If your action needs to do a bit of work before dispatching, it's easy to add
explict action creators. Note that if you define any action creators, no
implicit ones will be created.

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

    addMessage(cid, content) {
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

flux.actions.message.addMessage('Hello, world!');
```

### waitFor

To wait for another store, use `store.waitFor(storeKey)`. You can also read the
state of another store via `store.stores[storeKey].state`.

Here's a silly example where the message store is dependent on an id store to
create the ids.

```js
const createIdStore = (store) => {

  store.setState({
    id: 0
  });

  return {

    // This wrapping key signifies that the action is coming from the "message"
    // actions namespace rather than the "id" namespace.
    message: {

      addMessage() {
        store.setState({
          id: store.state.id + 1
        });
      }
    }
  };
};

const createMessageStore = (store) => {

  store.setState({
    messages: []
  });

  return {

    addMessage(content) {
      // Here we wait for the "id" store to finish.
      store.waitFor('id');
      store.setState({
        messages: store.state.messages.concat({
          // Peeking at the (read-only) state of the "id" store.
          id: store.stores.id.state.id,
          content: content
        })
      });
    }
  };
};

const flux = Flux.create({
  stores: {
    message: createMessageStore,
    id: createIdStore
  }
});
```

### Async

Implicit actions make it pretty easy to do async while explicit dispatch still
makes it really clear. If your success and error action creators are just
pass-through, no need to specify them.

```js
import SomeDataService from '../some-data-service';

const messageActions = {

  addMessage(dispatch, content) {
    const cid = (new Date()).getTime();
    // Do the optimistic dispatch.
    dispatch(cid, content);
    SomeDataService.addMessage(content)
      .then((result) => {
        // Dispatch for success.
        dispatch.to.addMessageDone(cid, result.id);
      })
      .catch((error) => {
        // Dispatch for failure.
        dispatch.to.addMessageFail(cid, error);
      });
  }
};

const createMessageStore = (store) => {

  store.setState({
    messages: [],
    errors: []
  });

  return {

    addMessage(cid, content) {
      store.setState({
        messages: store.state.messages.concat({
          cid: cid,
          content: content
        })
      });
    },

    addMessageDone(cid, id) {
      const index = _.findIndex(store.state.messages, (message) => {
        return message.cid === cid;
      });

      const newState = update(store.state, {
        messages: {
          [index]: {
            id: {$set: id}
          }
        }
      });

      store.setState(newState);
    },

    addMessageFail(cid, error) {
      const newState = update(store.state, {
        errors: {
          $push: [error]
        }
      });

      store.setState(newState);
    }
  };
};

const flux = Flux.create({
  actions: {
    message: messageActions
  },
  stores: {
    message: createMessageStore
  }
});

flux.actions.message.addMessage('Hey, that was pretty easy!');
```

### Action creators from factories

The examples above show the action creators as just functions in an object.
You can also use a factory to create your action creators. This keeps the api
more consistent. Just remember: if you start holding on to state inside the
closure, you're probably cheating!

```js
import SomeDataService from '../some-data-service';

const createMessageActions = (actions) => {

  addMessage(dispatch, content) {
    const cid = (new Date()).getTime();
    // Do the optimistic dispatch.
    dispatch(cid, content);
    SomeDataService.addMessage(content)
      .then((result) => {
        // Dispatch for success.
        actions.addMessageDone(cid, result.id);
      })
      .catch((error) => {
        // Dispatch for failure.
        actions.addMessageFail(cid, error);
      });
  }
};

const createMessageStore = (store) => {
  ...
};

const flux = Flux.create({
  actions: {
    message: createMessageActions
  },
  stores: {
    message: createMessageStore
  }
});
```

One benefit of this is it makes it easy to bind your actions to other
dependencies, like a data service.

```js
const createMessageActions = (DataService, actions) => {
  ...
};

const createMessageStore = (store) => {
  ...
};

const flux = Flux.create({
  actions: {
    message: createMessageActions.bind(null, SomeDataService)
  },
  stores: {
    message: createMessageStore
  }
});
```

## Add-ons

### connectToStores

Higher-order component to listen to stores and pass state to a wrapped
component.

```js
import Flux from 'nano-flux/addons';
import Message from './message';

const Messages = React.createClass({
  render() {
    return (
      <ul>
        {this.props.messages.map((message) => {
          return <Message message={message}/>;
        })}
      </ul>
    )
  }
});

const ConnectedMessages = Flux.addons.connectToStores(Messages, ['message'], (stores, props) => {
  return {
    messages: stores.message.state.messages
  };
});

React.render(<ConnectedMessages flux={flux}/>);
```

### injectActions

Higher-order component to pass actions to a wrapped component. Use with
connectToStores to remove the need to pass around the flux object at all.

```js
import Flux from 'nano-flux/addons';
import Message from './message';

const Messages = React.createClass({
  render() {
    return (
      <div>
        <ul>
          {this.props.messages.map((message) => {
            return <Message message={message}/>;
          })}
        </ul>
        <button onClick={this.props.addMessage}>Add Message</button>
      </div>
    )
  }
});

const ConnectedMessages = Flux.addons.connectToStores(Messages, ['message'], (stores, props) => {
  return {
    messages: stores.message.state.messages
  };
});

const ActionMessages = Flux.addons.injectActions(ConnectedMessages, ['message'], (actions) => {
  return actions.message;
});

React.render(<ActionMessages flux={flux}/>);
```
