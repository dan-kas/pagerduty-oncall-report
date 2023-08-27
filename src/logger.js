import { createConsola } from "consola";

const logger = createConsola({
  fancy: true,
  formatOptions: {
    date: false,
    compact: false,
    colors: true,
  },
});

export default logger;

