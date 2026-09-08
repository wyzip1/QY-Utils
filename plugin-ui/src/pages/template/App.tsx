import React from "react";
import { AppStyled } from "./styled";
import { RouterComponentProps } from "@/components/RenderRouter";

const App: React.FC<RouterComponentProps> = () => {
  return <AppStyled className="page-container">template</AppStyled>;
};

export default App;
