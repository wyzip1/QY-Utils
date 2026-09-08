import styled from "styled-components";

export const LayoutPageStyled = styled.div`
  height: 100vh;

  & > .layout {
    height: 100%;

    & .layout-content {
      overflow: auto;
      min-height: calc(100% - 32px);
      /* height: calc(100% - 32px); */
      margin: 16px;
      padding: 20px 16px;
      box-sizing: border-box;
      background-color: #fff;
    }
  }
`;
