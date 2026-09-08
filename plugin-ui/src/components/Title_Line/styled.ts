import styled from "styled-components";

export const TitleLineStyled = styled.div<{ themeColor?: string }>`
  display: flex;
  align-items: center;
  height: 32px;
  font-size: 14px;
  font-weight: bold;

  &::before {
    content: "";
    display: inline-block;

    width: 2px;
    height: 100%;
    margin-right: 10px;
    background-color: ${props => props.themeColor};
  }
`;
