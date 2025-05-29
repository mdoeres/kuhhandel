import React, { Component } from 'react'
import Peer from 'simple-peer'
import { Control } from 'kuhhandel-components'
import AI from './AI'
import './App.css'

let peer = null
const peerConfig = {
  trickle: false,
  config: {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  }
}

class App extends Component {

  state = { connected: false, error: false, id: null, props: null }

  async componentDidMount() {
    let signalData
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const signalDataParam = urlParams.get('signalData');
      console.log('Received signal data param:', signalDataParam);
      
      if (!signalDataParam) {
        throw new Error('No signal data');
      }
      signalData = JSON.parse(atob(signalDataParam));
      console.log('Parsed signal data:', signalData);
    } catch (err) {
      console.error('Error parsing signal data:', err)
      this.setState({ error: 'No signal data was provided' })
      return
    }
    
    try {
      console.log('Creating new peer with config:', peerConfig);
      peer = new Peer(peerConfig)
      
      peer.on('signal', data => {
        console.log('Peer signal event:', data);
        this.onSignal(data);
      })
      
      peer.on('connect', () => {
        console.log('Peer connected');
        this.setState({ connected: true })
      })
      
      peer.on('data', data => {
        console.log('Received data:', data);
        try {
          const parsedData = JSON.parse(data);
          this.onProps(parsedData);
        } catch (err) {
          console.error('Error parsing received data:', err);
        }
      })
      
      peer.on('close', () => {
        console.log('Peer connection closed');
        this.setState({ connected: false, error: 'Connection closed' })
      })
      
      peer.on('error', err => {
        console.error('Peer error:', err);
        this.setState({ error: 'Connection error occurred' })
      })

      console.log('Signaling with data:', signalData);
      peer.signal(signalData);
    } catch (err) {
      console.error('Error setting up peer:', err);
      this.setState({ error: 'Failed to establish connection' });
    }
  }

  render() {
    const { error, connected, id, props } = this.state

    if (props) {
      console.log('Rendering game controls with props:', props)
      const { id } = props
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
    } else if (id) {
      content = [
        <label key="label">
          Use this Id to connect the game to your controller:
        </label>,
        <div key="id" className="remote__id">{id}</div>
      ]
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
    if (peer && peer.connected) {
      console.log('Sending action:', opts)
      peer.send(JSON.stringify(opts))
    } else {
      console.error('Cannot send: peer not connected')
    }
  }

  onSignal = data => {
    const host = process.env.NODE_ENV === 'production'
      ? 'kuhhandel-main.onrender.com'
      : window.location.host
    const connectUrl = `http://${host}?connect=${btoa(JSON.stringify(data))}`
    this.setState({ id: connectUrl })
  }
}

export default App
