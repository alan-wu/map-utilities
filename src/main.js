import { createApp } from "vue";
import App from "./App.vue";

import AnnotationToolbar from "./components/AnnotationToolbar.vue";

const app = createApp(App);
app.component("AnnotationToolbar", AnnotationToolbar);
app.mount("#app");
