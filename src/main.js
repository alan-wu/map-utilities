import { createApp } from "vue";
import App from "./App.vue";

import AnnotationToolbar from "./components/AnnotationToolbar.vue";
import HelpModeDialog from "./components/HelpModeDialog.vue";

const app = createApp(App);
app.component("AnnotationToolbar", AnnotationToolbar);
app.component("HelpModeDialog", HelpModeDialog);
app.mount("#app");
