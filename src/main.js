import { createApp } from "vue";
import App from "./App.vue";

import DrawToolbar from "./components/DrawToolbar.vue";
import HelpModeDialog from "./components/HelpModeDialog.vue";

const app = createApp(App);
app.component("DrawToolbar", DrawToolbar);
app.component("HelpModeDialog", HelpModeDialog);
app.mount("#app");
