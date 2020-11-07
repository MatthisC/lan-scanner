# Lan-scanner

Le projet consiste à pouvoir scanner le réseau local, en exploitant la lenteur des réponses lors de `fetch`.

# Installation

`npm install`
`npm start`

# Utilisation

On peut modifier plusieurs paramètres : la précision, et le timeout

### La précision

Une faible précision implique un scan rapide, mais peu précis. Plus la précision sera élevé, moins les requêtes seront faites en parallèle.
Par exemple, si on met une précision de 255, les 255 requêtes pour scanner le réseau se feront les unes après les autres.
Si on met une précision de 1, toutes les requêtes seront faites en même temps, et le résultat sera donc rapide, mais peut ne pas être très précis car le nombre de requêtes envoyées peut ralentir le navigateur, et donc certaines requêtes peuvent atteindre le timeout alors qu'elles n'auraient pas du

### Le timeout

Il s'ahit du temps après lequel une requête est abandonnée. Plus on a de scan à faire tourner en même temps, plus le timeout doit être élevé, à cause du ralentissement du navigateur.
