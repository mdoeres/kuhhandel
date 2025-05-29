import React, { Component } from 'react'
import { Control } from 'kuhhandel-components'
import AI from './AI'
import './App.css'

class App extends Component {
  state = { connected: false, error: false, id: null, props: null }
  ws = null

  async componentDidMount() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const gameId = urlParams.get('gameId');
      console.log('Received game ID:', gameId);
      
      if (!gameId) {
        throw new Error('No game ID provided');
      }

      const wsUrl = process.env.NODE_ENV === 'production'
        ? `wss://kuhhandel-main.onrender.com/ws/${gameId}`
        : `ws://localhost:3002/ws/${gameId}`;

      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.setState({ connected: true });
      };
      
      this.ws.onmessage = (event) => {
        console.log('Received data:', event.data);
        try {
          const data = JSON.parse(event.data);
          this.onProps(data);
        } catch (err) {
          console.error('Error parsing received data:', err);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.setState({ connected: false, error: 'Connection closed' });
      };
      
      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        this.setState({ error: 'Connection error occurred' });
      };
    } catch (err) {
      console.error('Error setting up connection:', err);
      this.setState({ error: 'Failed to establish connection' });
    }
  }

  componentWillUnmount() {
    if (this.ws) {
      this.ws.close();
    }
  }

  render() {
    const { error, connected, props } = this.state

    if (props) {
      console.log('Rendering game controls with props:', props)
      const overloadedProps = {
        ...props,
        onDraw: () => this.onSend({ method: 'onDraw' }),
        onAuctionStart: () => this.onSend({ method: 'onAuctionStart' }),
        onAuctionClose: () => this.onSend({ method: 'onAuctionClose'}),
        onAuctionOffer: payload => this.onSend({ method: 'onAuctionOffer', payload }),
        onExchange: payload => this.onSend({ method: 'onExchange', payload }),
        onExchangeAccept: () => this.onSend({ method: 'onExchangeAccept' }),
        onBuyBack: payload => this.onSend({ method: 'onBuyBack', payload }),
        onCowTradeStart: payload => this.onSend({ method: 'onCowTradeStart', payload }),
        onCowTradeRespond: payload => this.onSend({ method: 'onCowTradeRespond', payload }),
      }
      return <AI {...overloadedProps}>
        <Control {...overloadedProps} />
      </AI>
    }

    let content = "Remote Control"

    if (error) {
      content = <div className="remote__error">
        {error}
      </div>
    } else if (connected) {
      content = <div className="remote__connected">
        Connected! Waiting for game data...
      </div>
    } else {
      content = <div className="remote__connecting">
        Connecting to game...
      </div>
    }

    return <div className="remote">
      {content}
    </div>
  }

  onProps = data => {
    console.log('Received game data:', data)
    if (data.method === 'init' || data.method === 'update') {
      this.setState({ props: data.payload })
    }
  }

  onSend = opts => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending action:', opts)
      this.ws.send(JSON.stringify(opts))
    } else {
      console.error('Cannot send: WebSocket not connected')
    }
  }
}

export default App
