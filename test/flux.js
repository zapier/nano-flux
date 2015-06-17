/* global describe, it, expect */

import Flux from '../lib/flux';
import React from 'react/addons';
import _ from 'lodash';

const update = React.addons.update;

// Fake sync Promise. Stupid jest with old jasmine. Yuck.
const StupidSyncPromise = {
  resolve(value) {
    return {
      then(cb) {
        const newValue = cb(value);
        return StupidSyncPromise.resolve(newValue);
      },
      catch() {}
    };
  },
  reject(err) {
    return {
      then() {
        return StupidSyncPromise.reject(err);
      },
      catch(cb) {
        const newValue = cb(err);
        return StupidSyncPromise.resolve(newValue);
      }
    };
  }
};

describe('flux', () => {

  it('should create flux instance with a dispatcher', () => {

    const flux = Flux.create();

    // Dispatcher exposed in case you need it.
    expect(typeof flux.dispatcher).toEqual('object');

  });

  it('should create flux instance with a store and implicit actions', () => {

    const setupMessageStore = (store) => {

      let messages = [];

      return {

        addMessage(content) {
          messages = messages.concat(content);
          store.setState({
            messages
          });
        }
      };
    };

    const flux = Flux.create({
      stores: {
        message: setupMessageStore
      }
    });

    let state = null;

    flux.stores.message.on('change', (newState) => {
      state = newState;
    });

    flux.actions.message.addMessage('Hello, world!');

    expect(state).toEqual({messages: ['Hello, world!']});

  });

  it('should emit dispatch events', () => {

    const setupMessageStore = () => {
      return {
        addMessage() {}
      };
    };

    const flux = Flux.create({
      stores: {
        message: setupMessageStore
      }
    });

    flux.on('dispatch', (action) => {
      expect(action.actionsKey).toEqual('message');
      expect(action.actionKey).toEqual('addMessage');
      expect(action.args).toEqual(['Hello!']);
    });

    flux.actions.message.addMessage('Hello!');
  });

  it('should create flux instance with a store and explicit actions', () => {

    let uniqueId = 0;

    const messageActions = {

      addMessage(dispatch, content) {
        uniqueId++;
        dispatch(uniqueId, content);
      }
    };

    const setupMessageStore = (store) => {

      let messages = [];

      return {

        addMessage(id, content) {
          messages = messages.concat({
            id,
            content
          });
          store.setState({
            messages
          });
        }
      };
    };

    const flux = Flux.create({
      actions: {
        message: messageActions
      },
      stores: {
        message: setupMessageStore
      }
    });

    let state = null;

    flux.stores.message.on('change', (newState) => {
      state = newState;
    });

    flux.actions.message.addMessage('Hello, world!');

    expect(state).toEqual({
      messages: [
        {
          id: 1,
          content: 'Hello, world!'
        }
      ]
    });

  });

  it('should allow actions to be a factory function', () => {

    let uniqueId = 0;

    const setupMessageActions = (actions) => ({

      addMessage(dispatch, content) {
        actions.reallyAddMessage(content);
      },

      reallyAddMessage(dispatch, content) {
        uniqueId++;
        dispatch(uniqueId, content);
      }
    });

    const setupMessageStore = (store) => {

      let messages = [];

      return {

        reallyAddMessage(id, content) {
          messages = messages.concat({
            id,
            content
          });
          store.setState({
            messages
          });
        }
      };
    };

    const flux = Flux.create({
      actions: {
        message: setupMessageActions
      },
      stores: {
        message: setupMessageStore
      }
    });

    let state = null;

    flux.stores.message.on('change', (newState) => {
      state = newState;
    });

    flux.actions.message.addMessage('Hello, world!');

    expect(state).toEqual({
      messages: [
        {
          id: 1,
          content: 'Hello, world!'
        }
      ]
    });

  });

  // Just a helper to create a flux instance that can optional waitFor another
  // store.
  const createWaitForFlux = (doesWaitFor) => {

    const setupIdStore = (store) => {

      store.setState({
        id: 0
      });

      return {

        message: {

          addMessage() {
            store.setState({
              id: store.state.id + 1
            });
          }
        }
      };
    };

    const setupMessageStore = (store) => {

      store.setState({
        messages: []
      });

      return {

        addMessage(content) {
          if (doesWaitFor) {
            store.waitFor('id');
          }
          store.setState({
            messages: store.state.messages.concat({
              id: store.stores.id.state.id,
              content: content
            })
          });
        }
      };
    };

    const flux = Flux.create({
      stores: {
        message: setupMessageStore,
        id: setupIdStore
      }
    });

    return flux;
  };

  // Have to do this test to make sure waitFor makes any difference for the
  // next test.
  it('should give incorrect id if no waitFor', () => {

    const flux = createWaitForFlux(false);

    let state = null;

    flux.stores.message.on('change', (newState) => {
      state = newState;
    });

    flux.actions.message.addMessage('Hello, world!');

    expect(state).toEqual({
      messages: [
        {
          id: 0,
          content: 'Hello, world!'
        }
      ]
    });

  });

  it('should give correct id if waitFor', () => {

    const flux = createWaitForFlux(true);

    let state = null;

    flux.stores.message.on('change', (newState) => {
      state = newState;
    });

    flux.actions.message.addMessage('Hello, world!');

    expect(state).toEqual({
      messages: [
        {
          id: 1,
          content: 'Hello, world!'
        }
      ]
    });

  });

  const createData = () => {

    let id = 0;

    return {

      addMessage(content) {

        if (typeof content !== 'string') {
          return StupidSyncPromise.reject({
            type: 'invalid_content'
          });
        }

        id++;

        return StupidSyncPromise.resolve({
          id: id
        });
      }

    };

  };

  it('should delegate actions for async', () => {

    const data = createData();

    const messageActions = {

      addMessage(dispatch, content) {
        const cid = (new Date()).getTime();
        dispatch(cid, content);
        data.addMessage(content)
          .then((result) => {
            dispatch.actions.addMessageDone(cid, result.id);
          })
          .catch((error) => {
            dispatch.actions.addMessageFail(cid, error);
          });
      }
    };

    const setupMessageStore = (store) => {

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
        message: setupMessageStore
      }
    });

    let didAddMessage = false;
    let didError = false;

    flux.stores.message.on('change', (newState) => {
      if (newState.messages[0].id === 1) {
        didAddMessage = true;
      }
      if (newState.errors.length > 0) {
        didError = true;
      }
    });

    flux.actions.message.addMessage('Hello, world!');
    flux.actions.message.addMessage(0);

    expect(didAddMessage).toBe(true);
    expect(didError).toBe(true);
  });

  it('should allow dispatching to other actions', () => {

    let hitServerSaveCount = 0;
    let hitServerUpdateCount = 0;

    let nextServerId = 0;

    const createMessageActions = () => ({

      draftAddMessage(dispatch) {
        dispatch.to.addMessage();
      },

      draftUpdateMessage(dispatch, attrs) {
        dispatch.to.updateMessage(attrs);
      },

      saveUpdateMessage(dispatch, attrs) {
        dispatch.to.updateMessage(attrs);
        if (attrs.id) {
          hitServerUpdateCount++;
        } else {
          hitServerSaveCount++;
          nextServerId++;
          dispatch.to.updateMessage({id: nextServerId, cid: attrs.cid});
        }
      }
    });

    const createMessageStore = (store) => {

      let nextId = 0;

      store.setState({
        messages: {}
      });

      return {
        addMessage() {
          nextId++;

          store.setState({
            messages: _.assign({}, store.state.messages, {
              [nextId]: {
                cid: nextId,
                content: ''
              }
            })
          });
        },

        updateMessage(attrs) {
          store.setState({
            messages: _.assign({}, store.state.messages, {
              [attrs.cid]: _.assign({}, store.state.messages[attrs.cid], attrs)
            })
          });
        }
      };
    };

    const flux = Flux.create({
      actions: {
        message: createMessageActions
      },
      stores: {
        message: createMessageStore
      }
    });

    flux.actions.message.draftAddMessage();

    flux.actions.message.draftUpdateMessage({cid: 1, content: 'Hell'});
    expect(flux.stores.message.state.messages).toEqual({1: {cid: 1, content: 'Hell'}});

    flux.actions.message.saveUpdateMessage({cid: 1, content: 'Hello!'});
    expect(flux.stores.message.state.messages).toEqual({1: {cid: 1, id: 1, content: 'Hello!'}});

    flux.actions.message.saveUpdateMessage({cid: 1, id: 1, content: 'Hello again!'});
    expect(flux.stores.message.state.messages).toEqual({1: {cid: 1, id: 1, content: 'Hello again!'}});

    expect(hitServerSaveCount).toEqual(1);
    expect(hitServerUpdateCount).toEqual(1);
  });

});
