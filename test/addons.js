/* global describe, it, expect */

import Flux from '../lib/flux';
import connectToStores from '../lib/addons/connect-to-stores';
import injectActions from '../lib/addons/inject-actions';
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
      expect(typeof this.props.addMessage).toEqual('function');
      return <div onClick={this.props.addMessage}>{ this.props.messages.length }</div>;
    }
  };

  const ConnectedMessageApp = connectToStores(MessageApp, ['message'], (stores, props) => {
    expect(props.testValue).toEqual('foo');
    return {
      messages: stores.message.state.messages
    };
  });

  const InjectedMessageApp = injectActions(ConnectedMessageApp, ['message'], (actions) => {
    return actions.message;
  });

  it('should pass state to component', () => {

    const renderedComponent = TestUtils.renderIntoDocument(
      <InjectedMessageApp flux={flux} testValue="foo"/>
    );

    var component = TestUtils.findRenderedDOMComponentWithTag(
      renderedComponent,
      'div'
    );

    var div = component.getDOMNode();

    expect(div.innerHTML).toEqual('0');

    TestUtils.Simulate.click(div);
    expect(div.innerHTML).toEqual('1');

  });

});
