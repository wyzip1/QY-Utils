import React from "react";
import { theme } from "antd";
import { TitleLineStyled } from "./styled";

const { useToken } = theme;

interface TitleLineProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const TitleLine: React.FC<TitleLineProps> = ({ children, ...rest }) => {
  const { token } = useToken();
  return (
    <TitleLineStyled {...rest} themeColor={token.colorPrimary}>
      {children}
    </TitleLineStyled>
  );
};

export default TitleLine;
