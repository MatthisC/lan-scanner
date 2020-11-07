import React from 'react'

export default class App extends React.Component {
	state = {
		hosts: [],
		timeAsked: 100,
		nbHostsScanned: 0,
		scanned_networks: 0,
		timeout: 300,
		currentTimeout: 300
	}

	ping = async (ip, onSuccess) => {
		// Cette fonction permet de faire un ping HTTP sur un hote. L'avantage est qu'elle utilise le retour d'erreur de la fonction
		// fetch, ce qui permet d'avoir le réseau utilisé par le client qui se connecte.
		return new Promise((resolve, reject) => {
			this.fetchWithTimeout("http://" + ip + ":45543", 4000, {})
				.then(() => console.log("Ne devrait pas arriver"), onSuccess)
		})
	}

	pingV2 = async (ip, timeout = 1000, nbHosts = 254) => {
		// Cette fonction permet de faire un ping HTTP sur un hote. Contrairement à la fonction ping, elle érit un rapport de chaque
		// adresse IP dans le state

		return new Promise((resolve, reject) => {
			this.fetchWithTimeout("http://" + ip + ":45543", timeout, {})
				.then(() => { }, (err) => {
					if ((('' + err).indexOf("aborted") === -1)) {
						this.setState({ hosts: this.state.hosts.concat([ip]) })
						console.log(ip + " " + err)
					}
					this.setState({ nbHostsScanned: this.state.nbHostsScanned + 1 })
					if (this.state.nbHostsScanned === nbHosts) {
						this.setState({ finished: true })
					}
					resolve()
				})
		})

	}

	transform_netmask = (mask) => {
		// Cette fonction permet de transformer le masque réseau sous la forme "/24" en "255.255.255.0"
		let bit_mask = [0, 0, 0, 0];
		for (let i = 0; i <= 32; i++) {
			if (i < mask) {
				bit_mask[~~(i / 8)] += 1
			}
		}
		return bit_mask.map((e) => (Math.pow(2, e) - 1))
	}

	multi_ping = (ipList) => {
		// Cette fonction permet de faire un scan de toutes les adresses IP dans ipList en même temps pour gagner du temps
		// Pour rappel, il vaut mieux éviter d'en faire trop à la fois, surtout sur les versions desktop de chrome, qui
		// à l'air de très mal gérer quand il y a beaucoup d'appel de fonctions en même temps.
		return new Promise((resolve, reject) => {
			let e = 0

			for (let i = 0; i < ipList.length; i++) {
				this.pingV2(ipList[i], this.state.timeout)
					.then(() => {
						e += 1;
						if (e === ipList.length) {
							resolve()
						}
					})
			}
		})
	}

	scan_network = async (network, mask = 24) => {
		return new Promise(async (resolve, reject) => {
			this.setState({ hosts: [] })
			const net = network.split('.');
			let bit_mask = this.transform_netmask(mask);
			let tmp = 0
			let ipList = []


			// Cette quadruple boucle un peu sale permet de créer une liste de listes d'adresses IP à scanner en même temps.
			// C'est ici que va intervenir le paramètre de précision, qui influe directement sur le nombre d'hotes
			// scannés en parallèle
			for (let i = 0; i < 256 - bit_mask[0]; i++) {
				for (let j = 0; j < 256 - bit_mask[1]; j++) {
					for (let k = 0; k < 256 - bit_mask[2]; k++) {
						for (let l = 1; l < 255 - bit_mask[3]; l++) {
							const ip = [parseInt(net[0]) + i, parseInt(net[1]) + j, parseInt(net[2]) + k, parseInt(net[3]) + l].join('.');
							if (tmp % parseInt(256 / (this.state.timeAsked)) === 0) {
								ipList.push([ip])
							} else {
								ipList[ipList.length - 1] = ipList[ipList.length - 1].concat([ip])
							}
							tmp++;
						}
					}
				}
			}
			for (const list of ipList) {
				await this.multi_ping(list)
			}
		})
	}

	smallMaskDetection = () => {
		//Cette fonction va récupérer le masque du réseau en évitant de tout scanner. Elle marchera sur la plupart des réseaux,
		//mais pas forcément sur tous.

		//La plage d'adresses IP sur un réseau local est 192.168.0.0/16. Toutes les adresse IP en .255 sont réservés pour le
		//broadcast, et auront donc un ping qui répondra vite. On va donc faire un ping sur tous les réseaux en .255 qui répondent.
		const t = new Date().getTime()
		for (let i = 0; i < 255; i++) {
			this.ping(`192.168.${i}.255`, () => {
				if (!this.state.ipNetwork) {
					this.setState({ ipNetwork: `192.168.${i}.0` })
				}
			})
				.catch(() => {
					this.setState({
						scanned_networks: this.state.scanned_networks + 1
					})
					const finalT = new Date().getTime() - t
					if (this.state.minTime > finalT) {
						this.setState({
							minTime: finalT
						})
					}
				})
		}

	}

	async fetchWithTimeout(resource, to, options) {
		// Cette fonction permet d'interrompre le fetch pour éviter d'avoir trop de fonction asynchrones qui tournent en arrière plan
		const { timeout = to } = options;

		const controller = new AbortController();
		setTimeout(() => controller.abort(), timeout);

		return fetch(resource, {
			...options,
			signal: controller.signal
		});
	}

	startDetection = () => {
		this.setState({ started: true, finished: false, hosts: [], timeout: this.state.currentTimeout, nbHostsScanned: 0 }, () => {
			if (this.state.ipNetwork) {
				this.scan_network(this.state.ipNetwork, 24, this.state.timeout)

			}
		})

	}


	componentDidMount() {
		this.smallMaskDetection()
		if (navigator.appVersion.indexOf("Win") >= 0) {
			this.setState({
				currentTimeout: "3500"
			})
		}
	}

	render() {
		return (
			<div>
				<h2>Votre réseau est détecté comme : {this.state.ipNetwork}</h2>
				<input name="time" type="range" min="1" max="255" value={this.state.timeAsked} onChange={(e) => this.setState({ timeAsked: e.target.value })} />
				<label for="time">Précision du scan</label>
				<br />
				<input name="timeout" value={this.state.currentTimeout} onChange={(e) => this.setState({ currentTimeout: e.target.value })} />
				<label for="number">Timeout</label>
				<br />
				<p>Temps de scan estimé : {this.state.timeAsked * this.state.currentTimeout/1000} secondes</p>
				{this.state.ipNetwork && <button onClick={this.startDetection} disabled={this.state.started && !this.state.finished}>Démarrer le scan</button>}
				{this.state.started && <div>
					<h2>Liste des hotes scannés :</h2>
					{this.state.hosts ? <ul>
						{this.state.hosts.map((host) => < li key={host} > {host}</li>)}
						{this.state.hosts.length === 0 && this.state.finished && <p>Aucun hote détecté :( Essayez un temps de scan plus élevé</p>}

					</ul> : <p>...</p>
					}
					{this.state.finished ? <p>Scan terminé !</p> : <p>Scan en cours...</p>}
				</div>}
			</div>
		)
	}
}

