import React from "react";
import styled from "styled-components";

interface RequireTitleProps {
  children?: React.ReactNode;
}

const RequireTitleStyled = styled.div`
  &::before {
    content: "*";
    color: red;
  }
`;

const RequireTitle: React.FC<RequireTitleProps> = ({ children }) => {
  return <RequireTitleStyled>{children}</RequireTitleStyled>;
};

export default RequireTitle;
