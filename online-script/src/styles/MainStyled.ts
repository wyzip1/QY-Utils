import { GlobalToken } from "antd";
import styled from "styled-components";

export interface ThemeStyledProps {
  antToken?: GlobalToken;
  mode?: string;
}

const MainStyled = styled.div<ThemeStyledProps>`
  --bg-primary: ${props => props.antToken?.colorBgContainer};
  --text-primary: ${props => props.antToken?.colorText};
  --color-border: ${props => props.antToken?.colorBorder};
  --primary-color: ${props => props.antToken?.colorPrimary};
`;

export default MainStyled;
