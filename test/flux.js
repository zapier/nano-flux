/* global describe, it */

import Flux from '../lib/flux';
import chai from 'chai';
import React from 'react/addons';
import _ from 'lodash';
require('es6-promise').polyfill();

const update = React.addons.update;

const expect = chai.expect;

describe('flux', () => {

  it('should create flux instance with a dispatcher', () => {

    const flux = Flux.create();

    // Dispatcher exposed in case you need it.
    expect(flux.dispatcher).to.be.an('object');

  });

  it('should create flux instance with a store and implicit actions', () => {

    const setupMessageStore = (store) => {

      let messages = [];

      return {

        onAddMessage(content) {
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

    expect(state).to.deep.equal({messages: ['Hello, world!']});

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

        onAddMessage(id, content) {
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

    expect(state).to.deep.equal({
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

          onAddMessage() {
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

        onAddMessage(content) {
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

    expect(state).to.deep.equal({
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

    expect(state).to.deep.equal({
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
          return Promise.reject({
            type: 'invalid_content'
          });
        }

        id++;

        return Promise.resolve({
          id: id
        });
      }

    };

  };

  it('should delegate actions for async', function (done) {

    this.timeout(100);

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

        onAddMessage(cid, content) {
          store.setState({
            messages: store.state.messages.concat({
              cid: cid,
              content: content
            })
          });
        },

        onAddMessageDone(cid, id) {
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

        onAddMessageFail(cid, error) {
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
      if (didAddMessage && didError) {
        done();
      }
    });

    flux.actions.message.addMessage('Hello, world!');
    flux.actions.message.addMessage(0);

  });

});
