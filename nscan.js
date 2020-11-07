async function ping(ip, timeout=800){
	console.log(`scanning ip ${ip}...`)
	return new Promise((resolve, reject) => {
		const t = new Date().getTime();
                fetch("http://" + ip + ":45543")
                .then(() => console.log("Ne devrait pas arriver"))
                .catch(() => {
                    time = new Date().getTime() - t;
                    time < timeout ? resolve(true) : reject();
                })
	})
}

function transform_netmask(mask) {
	let bit_mask = [0,0,0,0];
        for(let i=0; i<=32; i++) {
                if(i < mask) {
                        bit_mask[~~(i/8)] += 1
                }
        }
        return bit_mask.map((e) => (Math.pow(2, e) - 1))
}

let hosts = []

async function scan_network(network, mask=24, timeout=800) {
	//return new Promise(async (resolve, reject) => {
		hosts = [];
		const net = network.split('.');
		let bit_mask = transform_netmask(mask);
	

		for(let i=0; i<256-bit_mask[0]; i++) {
			for(let j=0; j<256-bit_mask[1]; j++) {
				for(let k=0; k<256-bit_mask[2]; k++){
					for(let l=0; l<256-bit_mask[3]; l++){
	
						const ip = [parseInt(net[0])+i, parseInt(net[1])+j, parseInt(net[2])+k, parseInt(net[3])+l].join('.');
						try {
							ping(ip, timeout)
							.then((e) => hosts = hosts.concat([ip]))
							.catch(() => {})
						} catch(e) {
							
						}

	
					}
				}
			}
		}

	//})
}



