/* global describe, it, expect */

import Flux from '../lib/flux';
import connectToStores from '../lib/addons/connect-to-stores';
import React from 'react/addons';
require('es6-promise').polyfill();
const TestUtils = React.addons.TestUtils;

describe('flux', () => {

  const setupMessageStore = (store) => {

    store.setState({
      messages: []
    });

    return {

      addMessage(content) {
        store.setState({
          messages: store.state.messages.concat(content)
        });
      }
    };
  };

  const flux = Flux.create({
    stores: {
      message: setupMessageStore
    }
  });

  const MessageApp = class extends React.Component {
    render() {
      return <div>{ this.props.messages.length }</div>;
    }
  };

  const ConnectedMessageApp = connectToStores(MessageApp, ['message'], (stores, props) => {
    expect(props.testValue).toEqual('foo');
    return {
      messages: stores.message.state.messages
    };
  });

  it('should pass state to component', (done) => {

    const renderedComponent = TestUtils.renderIntoDocument(
      <ConnectedMessageApp flux={flux} testValue="foo"/>
    );

    var component = TestUtils.findRenderedDOMComponentWithTag(
      renderedComponent,
      'div'
    );

    var div = component.getDOMNode();

    expect(div.innerHTML).toEqual('0');

    flux.actions.message.addMessage('Hello!');
    expect(div.innerHTML).toEqual('1');
  });

});
