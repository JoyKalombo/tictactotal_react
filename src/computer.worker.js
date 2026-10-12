import { chooseComputerMove } from '../game/computer.js';
self.onmessage = ({data}) => self.postMessage(chooseComputerMove(data.game, data.difficulty));
