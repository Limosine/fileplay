<div>
    <ul>
        <li><a href="/contacts">Kontakte</a></li>
        <li><a href="/contacts">Kontakte</a></li>
        <li><a href="/contacts">Kontakte</a></li>
    </ul>
</div>

<style>
    div {
        float: left;
        height: 100vh;
    }
    ul {
        background-color: gray;
        width: 200px;
        height: 100%;
        list-style-type: none;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-content: center;
        border-right: 1px solid black;
        justify-content: space-around;
    }

    /* li {
        padding: 20%;
    } */

    li a{
        text-decoration: none;
        font-size: large;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-weight: bold;
        color: black;
        font-size: 20px;
        transition-duration: 0.7s;
    }

    li a:hover {
        color: white;
    }
</style>