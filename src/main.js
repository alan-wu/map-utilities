import { createApp } from "vue";
import App from "./App.vue";

import DrawToolbar from "./DrawToolbar/DrawToolbar.vue";
import HelpModeDialog from "./HelpModeDialog/HelpModeDialog.vue";
import Tooltip from "./Tooltip/Tooltip.vue";
import TreeControls from "./TreeControls/TreeControls.vue";

const app = createApp(App);

app.component("DrawToolbar", DrawToolbar);
app.component("HelpModeDialog", HelpModeDialog);
app.component("Tooltip", Tooltip);
app.component("TreeControls", TreeControls);

app.mount("#app");
